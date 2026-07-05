import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Parent, ParentRelation, PaymentStatus, Prisma } from '@prisma/client';
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
import { ParentFigureDto } from './dto/parent-figure.dto';
import { QueryStudentsDto } from './dto/query-students.dto';

/** Caller context needed to enforce teacher ownership scoping. */
export interface CallerContext {
  userId: string;
  role: Role | string;
}

// Only PAID payments are needed to compute how much a student has paid.
const paidPaymentsInclude = {
  payments: { where: { status: PaymentStatus.PAID }, select: { amount: true } },
} satisfies Prisma.StudentInclude;

// Detail include: parents, branch, course (+ price), paid payments, group links.
const studentDetailInclude = {
  parents: { orderBy: { lastName: 'asc' } },
  branch: true,
  course: { select: { id: true, name: true, pricePerMonth: true } },
  ...paidPaymentsInclude,
  groupLinks: {
    include: {
      group: { select: { id: true, name: true, teacherId: true } },
    },
    orderBy: { joinedAt: 'desc' },
  },
} satisfies Prisma.StudentInclude;

// List include: parents + branch + course (+ price) + paid payments.
const studentListInclude = {
  parents: { orderBy: { lastName: 'asc' } },
  branch: true,
  course: { select: { id: true, name: true, pricePerMonth: true } },
  ...paidPaymentsInclude,
} satisfies Prisma.StudentInclude;

/**
 * Enrich a student payload with the "subscription" (абонемент) figures the UI
 * shows: how much they must pay (from the student's courseFee, or the course
 * price), how much they have paid, and what they still owe. Strips the raw
 * payments array from the response.
 */
function serializeStudent<
  T extends {
    payments?: { amount: Prisma.Decimal }[];
    courseFee?: Prisma.Decimal | null;
    course?: { pricePerMonth?: Prisma.Decimal | null } | null;
  },
>(student: T) {
  const paidAmount = (student.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const dueAmount =
    student.courseFee != null
      ? Number(student.courseFee)
      : student.course?.pricePerMonth != null
        ? Number(student.course.pricePerMonth)
        : 0;
  const { payments: _payments, ...rest } = student;
  return {
    ...rest,
    paidAmount,
    dueAmount,
    owedAmount: Math.max(0, dueAmount - paidAmount),
  };
}

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

  /** Ensure a course exists, else 404. */
  private async assertCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
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
  async findAll(query: QueryStudentsDto, caller: CallerContext) {
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
    if (query.courseId) {
      and.push({ courseId: query.courseId });
    }
    if (query.search) {
      // Search: student name OR any parent workplace OR any parent position
      // (должность) — spec §4.4, e.g. 'доктор' finds students by a parent's job.
      const term = query.search;
      and.push({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          {
            parents: {
              some: { workplace: { contains: term, mode: 'insensitive' } },
            },
          },
          {
            parents: {
              some: { position: { contains: term, mode: 'insensitive' } },
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

    // The debt filter works on the COMPUTED owedAmount (courseFee/course price
    // minus PAID payments), which does not exist as a DB column — so fetch the
    // full filtered set, serialize, filter, and paginate in memory. Center-scale
    // datasets (hundreds of students) make this perfectly cheap.
    if (query.debt) {
      const rows = await this.prisma.student.findMany({
        where,
        include: studentListInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      const filtered = rows
        .map(serializeStudent)
        .filter((s) =>
          query.debt === 'with' ? s.owedAmount > 0 : s.owedAmount <= 0,
        );
      return buildPaginatedResult(
        filtered.slice(skip, skip + take),
        filtered.length,
        page,
        pageSize,
      );
    }

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

    return buildPaginatedResult(
      items.map(serializeStudent),
      total,
      page,
      pageSize,
    );
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

    return serializeStudent(student);
  }

  /** Create a student, optionally with father/mother slots and/or parents[]. */
  async create(dto: CreateStudentDto) {
    await this.assertBranchExists(dto.branchId);
    if (dto.courseId) {
      await this.assertCourseExists(dto.courseId);
    }

    const parentCreates = this.buildParentCreates(dto);

    const data: Prisma.StudentCreateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      phone: dto.phone,
      level: dto.level,
      referralSource: dto.referralSource,
      courseFee: dto.courseFee,
      isActive: dto.isActive,
      enrollmentDate: dto.enrollmentDate
        ? new Date(dto.enrollmentDate)
        : undefined,
      branch: { connect: { id: dto.branchId } },
      ...(dto.courseId ? { course: { connect: { id: dto.courseId } } } : {}),
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      ...(parentCreates.length > 0 ? { parents: { create: parentCreates } } : {}),
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

  /**
   * Partial update of a student's scalar fields / branch / linked user.
   * The explicit `father` / `mother` slots, when sent, upsert the single
   * FATHER / MOTHER parent for this student.
   */
  async update(id: string, dto: UpdateStudentDto) {
    await this.ensureExists(id);

    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }
    if (dto.courseId) {
      await this.assertCourseExists(dto.courseId);
    }

    const data: Prisma.StudentUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      phone: dto.phone,
      // Nullable scalars: undefined = leave unchanged, null = clear.
      level: dto.level,
      referralSource: dto.referralSource,
      courseFee: dto.courseFee,
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
    if (dto.courseId !== undefined) {
      data.course = dto.courseId
        ? { connect: { id: dto.courseId } }
        : { disconnect: true };
    }
    if (dto.userId !== undefined) {
      data.user = dto.userId
        ? { connect: { id: dto.userId } }
        : { disconnect: true };
    }

    try {
      await this.prisma.student.update({ where: { id }, data });
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }

    // Upsert the explicit father/mother slots (if the form sent them).
    if (dto.father) {
      await this.upsertParentFigure(id, dto.father, ParentRelation.FATHER);
    }
    if (dto.mother) {
      await this.upsertParentFigure(id, dto.mother, ParentRelation.MOTHER);
    }

    return this.prisma.student.findUnique({
      where: { id },
      include: studentDetailInclude,
    });
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
        relation: dto.relation,
        position: dto.position,
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

  /**
   * Assemble the nested parent-create rows for a new student, merging the
   * explicit father/mother slots (forced relation) with the generic parents[]
   * array (each keeping its own relation, defaulting to OTHER).
   */
  private buildParentCreates(
    dto: CreateStudentDto,
  ): Prisma.ParentCreateWithoutStudentInput[] {
    const creates: Prisma.ParentCreateWithoutStudentInput[] = [];
    if (dto.father) {
      creates.push(this.figureData(dto.father, ParentRelation.FATHER));
    }
    if (dto.mother) {
      creates.push(this.figureData(dto.mother, ParentRelation.MOTHER));
    }
    if (dto.parents && dto.parents.length > 0) {
      creates.push(...dto.parents.map((p) => this.parentData(p)));
    }
    return creates;
  }

  /** Map a generic parent DTO to Prisma create data (relation defaults to OTHER). */
  private parentData(
    dto: CreateParentDto,
  ): Prisma.ParentCreateWithoutStudentInput {
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      relation: dto.relation,
      position: dto.position,
      workplace: dto.workplace,
    };
  }

  /** Map a father/mother figure DTO to Prisma create data with a forced relation. */
  private figureData(
    dto: ParentFigureDto,
    relation: ParentRelation,
  ): Prisma.ParentCreateWithoutStudentInput {
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      relation,
      position: dto.position,
      workplace: dto.workplace,
    };
  }

  /**
   * Upsert the single father/mother parent for a student: update the existing
   * parent that holds this relation, or create one if none exists yet.
   */
  private async upsertParentFigure(
    studentId: string,
    figure: ParentFigureDto,
    relation: ParentRelation,
  ): Promise<void> {
    const existing = await this.prisma.parent.findFirst({
      where: { studentId, relation },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const data = {
      firstName: figure.firstName,
      lastName: figure.lastName,
      phone: figure.phone,
      position: figure.position,
      workplace: figure.workplace,
    };

    if (existing) {
      await this.prisma.parent.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.parent.create({
        data: { studentId, relation, ...data },
      });
    }
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
