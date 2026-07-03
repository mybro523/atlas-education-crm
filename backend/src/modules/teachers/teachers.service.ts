import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subject, Teacher } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';

/** Teacher enriched with a flattened `subjects: Subject[]` and its branch. */
export type TeacherWithSubjects = Teacher & {
  subjects: Subject[];
  branch?: unknown;
};

// Detail include: pull TeacherSubject → subject and the branch.
const teacherDetailInclude = {
  subjects: { include: { subject: true }, orderBy: { subject: { name: 'asc' } } },
  branch: true,
} satisfies Prisma.TeacherInclude;

type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: typeof teacherDetailInclude;
}>;

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Flatten the nested TeacherSubject join into a plain `subjects: Subject[]`
   * array (the shape the API contract §5 promises), keeping `branch`.
   */
  private toResponse(teacher: TeacherWithRelations): TeacherWithSubjects {
    const { subjects, ...rest } = teacher;
    return {
      ...rest,
      subjects: subjects.map((link) => link.subject),
    };
  }

  /** Ensure a branch exists, else 404 (API contract: unknown branchId → 404). */
  private async assertBranchExists(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
  }

  /** Ensure every subject id exists, else 404 listing the missing ones. */
  private async assertSubjectsExist(subjectIds: string[]): Promise<void> {
    if (subjectIds.length === 0) {
      return;
    }
    const found = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true },
    });
    if (found.length !== subjectIds.length) {
      const foundIds = new Set(found.map((s) => s.id));
      const missing = subjectIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Subject(s) not found: ${missing.join(', ')}`);
    }
  }

  /** Paginated list/search of teachers (API contract §5). */
  async findAll(
    query: QueryTeachersDto,
  ): Promise<PaginatedResult<TeacherWithSubjects>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.TeacherWhereInput = {};
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.subjectId) {
      // Teachers linked to the given subject via TeacherSubject.
      where.subjects = { some: { subjectId: query.subjectId } };
    }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        include: teacherDetailInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return buildPaginatedResult(
      rows.map((r) => this.toResponse(r)),
      total,
      page,
      pageSize,
    );
  }

  /** One teacher with subjects[] + branch, else 404. */
  async findOne(id: string): Promise<TeacherWithSubjects> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: teacherDetailInclude,
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }
    return this.toResponse(teacher);
  }

  /** Create a teacher, optionally with initial subject links. */
  async create(dto: CreateTeacherDto): Promise<TeacherWithSubjects> {
    await this.assertBranchExists(dto.branchId);

    const subjectIds = dto.subjectIds ?? [];
    await this.assertSubjectsExist(subjectIds);

    try {
      const created = await this.prisma.teacher.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          phone: dto.phone,
          branch: { connect: { id: dto.branchId } },
          ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
          subjects: {
            create: subjectIds.map((subjectId) => ({
              subject: { connect: { id: subjectId } },
            })),
          },
        },
        include: teacherDetailInclude,
      });
      return this.toResponse(created);
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Partial update of a teacher's scalar fields / branch / linked user. */
  async update(id: string, dto: UpdateTeacherDto): Promise<TeacherWithSubjects> {
    await this.ensureExists(id);

    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const data: Prisma.TeacherUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      phone: dto.phone,
    };
    if (dto.branchId) {
      data.branch = { connect: { id: dto.branchId } };
    }
    if (dto.userId !== undefined) {
      // Allow linking (id) or explicit unlink (empty string → null).
      data.user = dto.userId
        ? { connect: { id: dto.userId } }
        : { disconnect: true };
    }

    try {
      const updated = await this.prisma.teacher.update({
        where: { id },
        data,
        include: teacherDetailInclude,
      });
      return this.toResponse(updated);
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Delete a teacher (TeacherSubject rows cascade per schema). */
  async remove(id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.teacher.delete({ where: { id } });
    return { id };
  }

  /**
   * Replace the full set of a teacher's subjects (API contract §5).
   * Diffs against existing links: deletes missing, creates new, in one tx.
   */
  async setSubjects(
    id: string,
    subjectIds: string[],
  ): Promise<TeacherWithSubjects> {
    await this.ensureExists(id);
    await this.assertSubjectsExist(subjectIds);

    const target = new Set(subjectIds);
    const existing = await this.prisma.teacherSubject.findMany({
      where: { teacherId: id },
      select: { subjectId: true },
    });
    const existingIds = new Set(existing.map((e) => e.subjectId));

    const toCreate = subjectIds.filter((s) => !existingIds.has(s));
    const toDelete = [...existingIds].filter((s) => !target.has(s));

    await this.prisma.$transaction([
      ...(toDelete.length > 0
        ? [
            this.prisma.teacherSubject.deleteMany({
              where: { teacherId: id, subjectId: { in: toDelete } },
            }),
          ]
        : []),
      ...(toCreate.length > 0
        ? [
            this.prisma.teacherSubject.createMany({
              data: toCreate.map((subjectId) => ({
                teacherId: id,
                subjectId,
              })),
            }),
          ]
        : []),
    ]);

    return this.findOne(id);
  }

  /** Throw 404 if the teacher does not exist. */
  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }
  }

  /**
   * Translate Prisma write errors into HTTP-appropriate exceptions:
   *  - P2002 (unique) on the 1:1 user link → 409 (user already linked).
   *  - P2025 (missing related record, e.g. bad userId) → 404/400.
   */
  private mapWriteError(error: unknown, userId?: string): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          userId
            ? `User ${userId} is already linked to another teacher`
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
