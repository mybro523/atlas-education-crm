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
  user: { select: { id: true, email: true, isActive: true } },
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

  /** Create a teacher, optionally issuing cabinet credentials. */
  async create(dto: CreateTeacherDto): Promise<TeacherWithRelations> {
    await this.assertBranchExists(dto.branchId);

    // Cabinet access: create the TEACHER user first so a duplicate email
    // fails before the teacher row exists.
    let credentialUserId: string | undefined;
    if (dto.credentials) {
      credentialUserId = await this.createCabinetUser(
        dto.credentials.email,
        dto.credentials.password,
        dto.branchId,
      );
    }

    try {
      return await this.prisma.teacher.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          phone: dto.phone,
          specialty: dto.specialty,
          educationLevel: dto.educationLevel,
          telegramUsername: dto.telegramUsername,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          hourlyRate: dto.hourlyRate,
          branch: { connect: { id: dto.branchId } },
          ...(dto.userId || credentialUserId
            ? { user: { connect: { id: credentialUserId ?? dto.userId } } }
            : {}),
        },
        include: teacherInclude,
      });
    } catch (error) {
      if (credentialUserId) {
        await this.prisma.user
          .delete({ where: { id: credentialUserId } })
          .catch(() => undefined);
      }
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
      specialty: dto.specialty,
      educationLevel: dto.educationLevel,
      telegramUsername: dto.telegramUsername,
      // Nullable scalar: undefined = leave unchanged, null = clear.
      hourlyRate: dto.hourlyRate,
    };
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.hireDate !== undefined) {
      data.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    }
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
        include: teacherInclude,
      });
      if (dto.credentials) {
        await this.applyCredentials(
          id,
          dto.credentials.email,
          dto.credentials.password,
        );
        return this.findOne(id);
      }
      return updated;
    } catch (error) {
      throw this.mapWriteError(error, dto.userId);
    }
  }

  /** Create a TEACHER-role user for cabinet access; 409 on duplicate email. */
  private async createCabinetUser(
    email: string,
    password: string,
    branchId: string | null,
  ): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`User with email ${email} already exists`);
    }
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: 'TEACHER', branchId },
      select: { id: true },
    });
    return user.id;
  }

  /** Issue or refresh a teacher's cabinet login (create-or-update the user). */
  private async applyCredentials(
    teacherId: string,
    email: string,
    password: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { userId: true, branchId: true },
    });
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);

    if (teacher.userId) {
      const clash = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (clash && clash.id !== teacher.userId) {
        throw new ConflictException(`User with email ${email} already exists`);
      }
      await this.prisma.user.update({
        where: { id: teacher.userId },
        data: { email, passwordHash },
      });
      return;
    }

    const userId = await this.createCabinetUser(
      email,
      password,
      teacher.branchId,
    );
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { userId },
    });
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
