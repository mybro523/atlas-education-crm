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
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons.query.dto';

// Lesson detail shape (scalars + relations required by the contract on GET :id).
const lessonDetailInclude = {
  group: { include: { subject: true } },
  teacher: true,
  lessonRate: true,
} satisfies Prisma.LessonInclude;

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async findAll(
    query: ListLessonsQueryDto,
    user: AuthUser,
  ): Promise<PaginatedResult<unknown>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.LessonWhereInput = {};
    if (query.groupId) where.groupId = query.groupId;

    // Date range on startsAt: [from, to) — inclusive lower, exclusive upper.
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lt = new Date(query.to);
    }

    // Teacher scoping: an explicit ?teacherId wins; otherwise a TEACHER caller
    // is limited to their own lessons.
    if (query.teacherId) {
      where.teacherId = query.teacherId;
    } else if (user.role === Role.TEACHER) {
      const teacher = await this.resolveTeacher(user);
      where.teacherId = teacher.id;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        include: lessonDetailInclude,
        orderBy: { startsAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: lessonDetailInclude,
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    return lesson;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async create(dto: CreateLessonDto) {
    // Group must exist; grab its teacher for the default assignment.
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      select: { id: true, teacherId: true },
    });
    if (!group) throw new NotFoundException(`Group ${dto.groupId} not found`);

    const teacherId = dto.teacherId ?? group.teacherId ?? null;
    if (teacherId) await this.assertTeacherExists(teacherId);
    if (dto.lessonRateId) await this.assertLessonRateExists(dto.lessonRateId);

    return this.prisma.lesson.create({
      data: {
        groupId: dto.groupId,
        teacherId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        topic: dto.topic ?? null,
        room: dto.room ?? null,
        teacherPayRate: dto.teacherPayRate ?? null,
        lessonRateId: dto.lessonRateId ?? null,
        isConducted: dto.isConducted ?? false,
      },
      include: lessonDetailInclude,
    });
  }

  /**
   * Update a lesson. ADMIN/FOUNDER may edit anything; a TEACHER may edit only
   * their OWN lessons (ownership enforced against the current teacher on the row).
   */
  async update(id: string, dto: UpdateLessonDto, user: AuthUser) {
    // Proves the lesson exists and the caller may write it (ownership for teachers).
    await this.assertLessonAccess(id, user);

    if (dto.groupId !== undefined) await this.assertGroupExists(dto.groupId);
    if (dto.teacherId) await this.assertTeacherExists(dto.teacherId);
    if (dto.lessonRateId) await this.assertLessonRateExists(dto.lessonRateId);

    const data: Prisma.LessonUpdateInput = {};
    if (dto.groupId !== undefined)
      data.group = { connect: { id: dto.groupId } };
    if (dto.teacherId !== undefined) {
      data.teacher = dto.teacherId
        ? { connect: { id: dto.teacherId } }
        : { disconnect: true };
    }
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined)
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.topic !== undefined) data.topic = dto.topic;
    if (dto.room !== undefined) data.room = dto.room;
    if (dto.teacherPayRate !== undefined)
      data.teacherPayRate = dto.teacherPayRate;
    if (dto.lessonRateId !== undefined) {
      data.lessonRate = dto.lessonRateId
        ? { connect: { id: dto.lessonRateId } }
        : { disconnect: true };
    }
    if (dto.isConducted !== undefined) data.isConducted = dto.isConducted;

    return this.prisma.lesson.update({
      where: { id },
      data,
      include: lessonDetailInclude,
    });
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.lesson.delete({ where: { id } });
    return { id };
  }

  /** Mark a lesson conducted / not conducted (TEACHER own, or ADMIN/FOUNDER). */
  async conduct(id: string, isConducted: boolean, user: AuthUser) {
    await this.assertLessonAccess(id, user);

    return this.prisma.lesson.update({
      where: { id },
      data: { isConducted },
      include: lessonDetailInclude,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Resolve the Teacher profile linked to the caller, or 404. */
  private async resolveTeacher(user: AuthUser): Promise<{ id: string }> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException('No teacher profile linked to this account');
    }
    return teacher;
  }

  /**
   * Load a lesson and enforce write ownership. ADMIN/FOUNDER pass through;
   * a TEACHER must be the lesson's assigned teacher. Returns the loaded row.
   */
  private async assertLessonAccess(id: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) return lesson;

    if (user.role === Role.TEACHER) {
      const teacher = await this.resolveTeacher(user);
      if (lesson.teacherId !== teacher.id) {
        throw new ForbiddenException('You do not own this lesson');
      }
      return lesson;
    }

    throw new ForbiddenException('Insufficient permissions for this lesson');
  }

  private async assertGroupExists(groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
  }

  private async assertTeacherExists(teacherId: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
  }

  private async assertLessonRateExists(lessonRateId: string): Promise<void> {
    const rate = await this.prisma.lessonRate.findUnique({
      where: { id: lessonRateId },
      select: { id: true },
    });
    if (!rate)
      throw new NotFoundException(`LessonRate ${lessonRateId} not found`);
  }
}
