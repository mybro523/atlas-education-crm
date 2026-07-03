import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ListGroupsQueryDto } from './dto/list-groups.query.dto';

// Group detail shape (scalars + the relations the contract requires on GET :id).
const groupDetailInclude = {
  course: true,
  subject: true,
  teacher: true,
  _count: { select: { students: { where: { leftAt: null } } } },
} satisfies Prisma.GroupInclude;

// Member row shape: the join row plus a lightweight student projection.
const groupMemberSelect = {
  groupId: true,
  studentId: true,
  joinedAt: true,
  leftAt: true,
  student: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} satisfies Prisma.GroupStudentSelect;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async findAll(query: ListGroupsQueryDto): Promise<PaginatedResult<unknown>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.GroupWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (typeof query.active === 'boolean') where.isActive = query.active;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        include: groupDetailInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.group.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: groupDetailInclude,
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(dto: CreateGroupDto) {
    await this.assertReferencesExist(
      dto.courseId,
      dto.subjectId,
      dto.branchId,
      dto.teacherId,
    );

    return this.prisma.group.create({
      data: {
        name: dto.name,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId ?? null,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
      },
      include: groupDetailInclude,
    });
  }

  async update(id: string, dto: UpdateGroupDto) {
    // Ensure it exists first for a clean 404 (vs. a Prisma P2025).
    await this.findOne(id);

    await this.assertReferencesExist(
      dto.courseId,
      dto.subjectId,
      dto.branchId,
      dto.teacherId,
    );

    const data: Prisma.GroupUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.courseId !== undefined)
      data.course = { connect: { id: dto.courseId } };
    if (dto.subjectId !== undefined)
      data.subject = { connect: { id: dto.subjectId } };
    if (dto.teacherId !== undefined) {
      data.teacher = dto.teacherId
        ? { connect: { id: dto.teacherId } }
        : { disconnect: true };
    }
    if (dto.branchId !== undefined)
      data.branch = { connect: { id: dto.branchId } };
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.group.update({
      where: { id },
      data,
      include: groupDetailInclude,
    });
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.group.delete({ where: { id } });
    return { id };
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------

  /** List a group's members. Active-only unless `includeLeft` is true. */
  async listStudents(groupId: string, includeLeft: boolean, user: AuthUser) {
    await this.assertGroupAccess(groupId, user);

    return this.prisma.groupStudent.findMany({
      where: {
        groupId,
        ...(includeLeft ? {} : { leftAt: null }),
      },
      select: groupMemberSelect,
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Add a student to a group. Re-adding a previously-left student re-opens the
   * link (clears `leftAt`); an already-active membership → 409.
   */
  async addStudent(groupId: string, studentId: string, user: AuthUser) {
    await this.assertGroupAccess(groupId, user);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const existing = await this.prisma.groupStudent.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    if (existing) {
      if (existing.leftAt === null) {
        throw new ConflictException(
          'Student is already an active member of this group',
        );
      }
      // Re-open a previously-closed membership.
      return this.prisma.groupStudent.update({
        where: { groupId_studentId: { groupId, studentId } },
        data: { leftAt: null, joinedAt: new Date() },
        select: groupMemberSelect,
      });
    }

    return this.prisma.groupStudent.create({
      data: { groupId, studentId },
      select: groupMemberSelect,
    });
  }

  /** Soft-remove a student from a group (sets `leftAt = now`). */
  async removeStudent(groupId: string, studentId: string, user: AuthUser) {
    await this.assertGroupAccess(groupId, user);

    const link = await this.prisma.groupStudent.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (!link || link.leftAt !== null) {
      throw new NotFoundException(
        `Active membership for student ${studentId} in group ${groupId} not found`,
      );
    }

    return this.prisma.groupStudent.update({
      where: { groupId_studentId: { groupId, studentId } },
      data: { leftAt: new Date() },
      select: groupMemberSelect,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate that referenced FK rows exist. Only checks provided (defined) ids,
   * so it is reusable for both create (all set) and partial update.
   */
  private async assertReferencesExist(
    courseId?: string,
    subjectId?: string,
    branchId?: string,
    teacherId?: string,
  ): Promise<void> {
    if (courseId !== undefined) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException(`Course ${courseId} not found`);
    }
    if (subjectId !== undefined) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true },
      });
      if (!subject)
        throw new NotFoundException(`Subject ${subjectId} not found`);
    }
    if (branchId !== undefined) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      });
      if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);
    }
    // teacherId can be an empty string (=> disconnect) — only check real ids.
    if (teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true },
      });
      if (!teacher)
        throw new NotFoundException(`Teacher ${teacherId} not found`);
    }
  }

  /**
   * Ownership gate for member operations. ADMIN/FOUNDER may touch any group.
   * A TEACHER may only touch groups where `teacherId` == their own profile id.
   * Throws NotFound (group), Forbidden (not owner), or NotFound (no profile).
   */
  private async assertGroupAccess(
    groupId: string,
    user: AuthUser,
  ): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, teacherId: true },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) return;

    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!teacher) {
        throw new NotFoundException('No teacher profile linked to this account');
      }
      if (group.teacherId !== teacher.id) {
        throw new ForbiddenException('You do not own this group');
      }
      return;
    }

    // Any other role that reached here is not permitted.
    throw new ForbiddenException('Insufficient permissions for this group');
  }
}
