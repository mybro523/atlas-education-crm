import {
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
import { ListAvailableStudentsQueryDto } from './dto/list-available-students.query.dto';

// Group detail shape (scalars + the relations the contract requires on GET :id).
// `_count.students` is a FILTERED relation count: only ACTIVE links (leftAt=null).
const groupDetailInclude = {
  course: true,
  teacher: true,
  _count: { select: { students: { where: { leftAt: null } } } },
} satisfies Prisma.GroupInclude;

type GroupWithCount = Prisma.GroupGetPayload<{
  include: typeof groupDetailInclude;
}>;

// Lightweight student projection for the "addable students" picker.
const availableStudentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  phone: true,
  branchId: true,
} satisfies Prisma.StudentSelect;

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

    return buildPaginatedResult(
      items.map((g) => this.serializeGroup(g)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: groupDetailInclude,
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return this.serializeGroup(group);
  }

  async create(dto: CreateGroupDto) {
    await this.assertReferencesExist(
      dto.courseId,
      dto.branchId,
      dto.teacherId,
    );

    const created = await this.prisma.group.create({
      data: {
        name: dto.name,
        courseId: dto.courseId,
        teacherId: dto.teacherId ?? null,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
      },
      include: groupDetailInclude,
    });
    return this.serializeGroup(created);
  }

  async update(id: string, dto: UpdateGroupDto) {
    // Ensure it exists first for a clean 404 (vs. a Prisma P2025).
    await this.findOne(id);

    await this.assertReferencesExist(dto.courseId, dto.branchId, dto.teacherId);

    const data: Prisma.GroupUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.courseId !== undefined)
      data.course = { connect: { id: dto.courseId } };
    if (dto.teacherId !== undefined) {
      data.teacher = dto.teacherId
        ? { connect: { id: dto.teacherId } }
        : { disconnect: true };
    }
    if (dto.branchId !== undefined)
      data.branch = { connect: { id: dto.branchId } };
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.group.update({
      where: { id },
      data,
      include: groupDetailInclude,
    });
    return this.serializeGroup(updated);
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
   * List students that can still be ADDED to this group — i.e. every student
   * who is NOT already an active member (`leftAt = null`) of the group.
   *
   * Deliberately NOT scoped to the group's branch: the previous UI built this
   * list from the branch-filtered students endpoint, so a group in branch X
   * showed no candidates when the students lived in branch Y (the reported
   * "available students list is empty" bug). Any student may join any group.
   */
  async listAvailableStudents(
    groupId: string,
    query: ListAvailableStudentsQueryDto,
    user: AuthUser,
  ): Promise<PaginatedResult<unknown>> {
    await this.assertGroupAccess(groupId, user);

    const { skip, take, page, pageSize } = toSkipTake(query);

    const and: Prisma.StudentWhereInput[] = [
      // Exclude students already ACTIVE in this group (left members can re-join).
      { NOT: { groupLinks: { some: { groupId, leftAt: null } } } },
    ];
    if (query.search) {
      const term = query.search;
      and.push({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.StudentWhereInput = { AND: and };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        select: availableStudentSelect,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.student.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  /**
   * Add a student to a group — IDEMPOTENT. Guarantees an ACTIVE GroupStudent
   * link exists afterwards:
   *  - no link yet            → create it
   *  - link exists but left   → re-open it (clear `leftAt`, bump `joinedAt`)
   *  - link already active    → return it unchanged (no error)
   *
   * Making this idempotent fixes the reported "adding sometimes does not
   * persist" bug: a retry / double-submit no longer surfaces as a 409 that the
   * UI reports as a failure.
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
      // Already an active member — idempotent no-op, return the current link.
      if (existing.leftAt === null) {
        return this.prisma.groupStudent.findUniqueOrThrow({
          where: { groupId_studentId: { groupId, studentId } },
          select: groupMemberSelect,
        });
      }
      // Re-open a previously-closed membership.
      return this.prisma.groupStudent.update({
        where: { groupId_studentId: { groupId, studentId } },
        data: { leftAt: null, joinedAt: new Date() },
        select: groupMemberSelect,
      });
    }

    // Upsert guards against a race where two concurrent adds both pass the
    // findUnique check above (unique PK → the second create would otherwise
    // throw P2002); upsert makes the second call a harmless no-op update.
    return this.prisma.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      create: { groupId, studentId },
      update: { leftAt: null },
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
   * Flatten Prisma's nested `_count.students` (already filtered to ACTIVE links)
   * into a top-level `studentsCount` so the UI can render the member count.
   * `studentCount` is kept as an alias for robustness.
   */
  private serializeGroup(group: GroupWithCount) {
    const { _count, ...rest } = group;
    const studentsCount = _count?.students ?? 0;
    return { ...rest, studentsCount, studentCount: studentsCount };
  }

  /**
   * Validate that referenced FK rows exist. Only checks provided (defined) ids,
   * so it is reusable for both create (all set) and partial update.
   */
  private async assertReferencesExist(
    courseId?: string,
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
