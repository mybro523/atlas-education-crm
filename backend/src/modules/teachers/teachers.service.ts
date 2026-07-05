import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';

// Detail include: the branch and the teacher's groups (each carrying its course).
// Subjects were removed from the model — what a teacher teaches is now expressed
// through the groups they lead and each group's course.
const teacherInclude = {
  branch: true,
  groups: {
    include: {
      course: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.TeacherInclude;

export type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: typeof teacherInclude;
}>;

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Paginated list/search of teachers (API contract §5). */
  async findAll(
    query: QueryTeachersDto,
  ): Promise<PaginatedResult<TeacherWithRelations>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.TeacherWhereInput = {};
    if (query.branchId) {
      where.branchId = query.branchId;
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
        include: teacherInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return buildPaginatedResult(rows, total, page, pageSize);
  }

  /** One teacher with branch + groups (with course), else 404. */
  async findOne(id: string): Promise<TeacherWithRelations> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: teacherInclude,
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }
    return teacher;
  }

  /** Create a teacher. */
  async create(dto: CreateTeacherDto): Promise<TeacherWithRelations> {
    await this.assertBranchExists(dto.branchId);

    try {
      return await this.prisma.teacher.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          phone: dto.phone,
          branch: { connect: { id: dto.branchId } },
          ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
        },
        include: teacherInclude,
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Partial update of a teacher's scalar fields / branch / linked user. */
  async update(
    id: string,
    dto: UpdateTeacherDto,
  ): Promise<TeacherWithRelations> {
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
      return await this.prisma.teacher.update({
        where: { id },
        data,
        include: teacherInclude,
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Delete a teacher (groups keep their rows; teacherId is set null per schema). */
  async remove(id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.teacher.delete({ where: { id } });
    return { id };
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
