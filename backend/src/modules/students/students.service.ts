import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Parent, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { QueryStudentsDto } from './dto/query-students.dto';

/** Caller context needed to enforce teacher ownership scoping. */
export interface CallerContext {
  userId: string;
  role: Role | string;
}

// Detail include: parents, branch, and active group links with the group.
const studentDetailInclude = {
  parents: { orderBy: { lastName: 'asc' } },
  branch: true,
  groupLinks: {
    include: {
      group: { select: { id: true, name: true, teacherId: true } },
    },
    orderBy: { joinedAt: 'desc' },
  },
} satisfies Prisma.StudentInclude;

// List include: parents + branch (no group links for a lighter payload).
const studentListInclude = {
  parents: { orderBy: { lastName: 'asc' } },
  branch: true,
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ensure a branch exists, else 404. */
  private async assertBranchExists(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
  }

  /**
   * Resolve the Teacher profile linked to a user, else 404.
   * Used to scope TEACHER reads to their own groups' students.
   */
  private async resolveTeacherId(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException('No teacher profile linked to this account');
    }
    return teacher.id;
  }

  /**
   * Build a `where` clause that restricts a TEACHER to students who are active
   * members (leftAt = null) of a group the teacher owns.
   */
  private async teacherScopeWhere(
    userId: string,
  ): Promise<Prisma.StudentWhereInput> {
    const teacherId = await this.resolveTeacherId(userId);
    return {
      groupLinks: {
        some: { leftAt: null, group: { teacherId } },
      },
    };
  }

  /** Paginated list/search of students (API contract §6). */
  async findAll(
    query: QueryStudentsDto,
    caller: CallerContext,
  ): Promise<PaginatedResult<Prisma.StudentGetPayload<{ include: typeof studentListInclude }>>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const and: Prisma.StudentWhereInput[] = [];

    if (query.branchId) {
      and.push({ branchId: query.branchId });
    }
    if (query.groupId) {
      and.push({
        groupLinks: { some: { leftAt: null, groupId: query.groupId } },
      });
    }
    if (query.search) {
      // Dual search: student name OR any parent workplace (spec §4.4).
      and.push({
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          {
            parents: {
              some: {
                workplace: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    // Ownership scoping: a TEACHER only sees their own groups' students.
    if (caller.role === Role.TEACHER) {
      and.push(await this.teacherScopeWhere(caller.userId));
    }

    const where: Prisma.StudentWhereInput = and.length > 0 ? { AND: and } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        include: studentListInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.student.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  /**
   * One student with parents, branch, group links, else 404.
   * A TEACHER may only read students in their own groups (else 403).
   */
  async findOne(id: string, caller: CallerContext) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: studentDetailInclude,
    });
    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }

    if (caller.role === Role.TEACHER) {
      const teacherId = await this.resolveTeacherId(caller.userId);
      const owns = student.groupLinks.some(
        (link) => link.leftAt === null && link.group.teacherId === teacherId,
      );
      if (!owns) {
        throw new ForbiddenException(
          'This student does not belong to one of your groups',
        );
      }
    }

    return student;
  }

  /** Create a student, optionally with nested parents. */
  async create(dto: CreateStudentDto) {
    await this.assertBranchExists(dto.branchId);

    const data: Prisma.StudentCreateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      phone: dto.phone,
      isActive: dto.isActive,
      enrollmentDate: dto.enrollmentDate
        ? new Date(dto.enrollmentDate)
        : undefined,
      branch: { connect: { id: dto.branchId } },
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      ...(dto.parents && dto.parents.length > 0
        ? { parents: { create: dto.parents.map((p) => this.parentData(p)) } }
        : {}),
    };

    try {
      return await this.prisma.student.create({
        data,
        include: studentDetailInclude,
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Partial update of a student's scalar fields / branch / linked user. */
  async update(id: string, dto: UpdateStudentDto) {
    await this.ensureExists(id);

    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const data: Prisma.StudentUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      phone: dto.phone,
      isActive: dto.isActive,
    };
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.enrollmentDate !== undefined) {
      data.enrollmentDate = new Date(dto.enrollmentDate);
    }
    if (dto.branchId) {
      data.branch = { connect: { id: dto.branchId } };
    }
    if (dto.userId !== undefined) {
      data.user = dto.userId
        ? { connect: { id: dto.userId } }
        : { disconnect: true };
    }

    try {
      return await this.prisma.student.update({
        where: { id },
        data,
        include: studentDetailInclude,
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Delete a student (parents/links cascade per schema). */
  async remove(id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.student.delete({ where: { id } });
    return { id };
  }

  // ---- Parents sub-resource --------------------------------------------

  /** List a student's parents (respecting caller read scope). */
  async findParents(
    studentId: string,
    caller: CallerContext,
  ): Promise<Parent[]> {
    // Reuse findOne to enforce existence + teacher ownership, then return parents.
    const student = await this.findOne(studentId, caller);
    return student.parents;
  }

  /** Add a parent to a student. */
  async addParent(studentId: string, dto: CreateParentDto): Promise<Parent> {
    await this.ensureExists(studentId);
    return this.prisma.parent.create({
      data: { studentId, ...this.parentData(dto) },
    });
  }

  /** Update one parent of a student (parent must belong to the student). */
  async updateParent(
    studentId: string,
    parentId: string,
    dto: UpdateParentDto,
  ): Promise<Parent> {
    await this.assertParentBelongs(studentId, parentId);
    return this.prisma.parent.update({
      where: { id: parentId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        workplace: dto.workplace,
      },
    });
  }

  /** Remove one parent of a student. */
  async removeParent(
    studentId: string,
    parentId: string,
  ): Promise<{ id: string }> {
    await this.assertParentBelongs(studentId, parentId);
    await this.prisma.parent.delete({ where: { id: parentId } });
    return { id: parentId };
  }

  // ---- Helpers ----------------------------------------------------------

  /** Map a parent DTO to Prisma nested-create data. */
  private parentData(dto: CreateParentDto) {
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      workplace: dto.workplace,
    };
  }

  /** Throw 404 if the student does not exist. */
  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException(`Student ${id} not found`);
    }
  }

  /**
   * Ensure a parent exists AND belongs to the given student.
   * 404 if the parent is missing or attached to a different student.
   */
  private async assertParentBelongs(
    studentId: string,
    parentId: string,
  ): Promise<void> {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });
    if (!parent || parent.studentId !== studentId) {
      throw new NotFoundException(
        `Parent ${parentId} not found for student ${studentId}`,
      );
    }
  }

  /**
   * Translate Prisma write errors into HTTP-appropriate exceptions:
   *  - P2002 (unique) on the 1:1 user link → 409 (user already linked).
   *  - P2025 (missing related record, e.g. bad userId) → 400.
   */
  private mapWriteError(error: unknown, userId?: string): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          userId
            ? `User ${userId} is already linked to another student`
            : 'Unique constraint violation',
        );
      }
      if (error.code === 'P2025') {
        return new BadRequestException(
          userId ? `User ${userId} not found` : 'Related record not found',
        );
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
