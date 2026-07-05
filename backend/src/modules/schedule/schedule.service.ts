import {
  BadRequestException,
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
import { RoomOccupancyQueryDto } from './dto/room-occupancy.query.dto';

// Lesson detail shape (scalars + relations required by the contract on GET :id).
// The lesson's course is reached through its group (group → course); the course
// name is surfaced so list/detail responses can label each lesson.
const lessonDetailInclude = {
  group: { include: { course: true } },
  teacher: true,
  room: true,
  lessonRate: true,
} satisfies Prisma.LessonInclude;

// Lightweight lesson projection for the room-occupancy view.
const occupancyLessonSelect = {
  id: true,
  roomId: true,
  startsAt: true,
  endsAt: true,
  isConducted: true,
  group: {
    select: {
      id: true,
      name: true,
      course: { select: { id: true, name: true } },
    },
  },
  teacher: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.LessonSelect;

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
    if (query.roomId) where.roomId = query.roomId;
    // Course is reached through the group; filter via the group relation.
    if (query.courseId) where.group = { courseId: query.courseId };

    // Date range on startsAt: [from, to) — inclusive lower, exclusive upper.
    // Drives the month/calendar view.
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lt = new Date(query.to);
    }

    // Teacher scoping: a TEACHER caller is ALWAYS limited to their own lessons —
    // an arbitrary ?teacherId is ignored so a teacher can't enumerate another
    // teacher's schedule. Other staff may optionally filter by ?teacherId.
    if (user.role === Role.TEACHER) {
      const teacher = await this.resolveTeacher(user);
      where.teacherId = teacher.id;
    } else if (query.teacherId) {
      where.teacherId = query.teacherId;
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

  async findOne(id: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: lessonDetailInclude,
    });
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);
    // A TEACHER may only read their OWN lessons.
    if (user.role === Role.TEACHER) {
      const teacher = await this.resolveTeacher(user);
      if (lesson.teacherId !== teacher.id) {
        throw new ForbiddenException('You can only view your own lessons');
      }
    }
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
    if (dto.roomId) await this.assertRoomExists(dto.roomId);
    if (dto.lessonRateId) await this.assertLessonRateExists(dto.lessonRateId);

    return this.prisma.lesson.create({
      data: {
        groupId: dto.groupId,
        teacherId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        roomId: dto.roomId ?? null,
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
    if (dto.roomId) await this.assertRoomExists(dto.roomId);
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
    // roomId: an empty string clears the assignment; a real id connects a Room.
    if (dto.roomId !== undefined) {
      data.room = dto.roomId
        ? { connect: { id: dto.roomId } }
        : { disconnect: true };
    }
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
    const exists = await this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Lesson ${id} not found`);
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
  // Room occupancy
  // ---------------------------------------------------------------------------

  /**
   * Per-room free/occupied view over a time window. For every active room
   * (optionally scoped to a branch) returns whether any lesson overlaps the
   * window and the list of overlapping lessons, so the UI can present free vs.
   * occupied kabinets. Window is `date` (whole day) or an explicit `from`/`to`.
   */
  async roomOccupancy(query: RoomOccupancyQueryDto) {
    const { from, to } = this.resolveOccupancyWindow(query);

    const roomWhere: Prisma.RoomWhereInput = { isActive: true };
    if (query.branchId) roomWhere.branchId = query.branchId;

    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        branchId: true,
        isActive: true,
      },
    });

    // Room-assigned lessons overlapping [from, to). A lesson with an end time
    // overlaps when it starts before the window ends and ends after it begins;
    // an open-ended lesson (no endsAt) counts only if it starts inside the window.
    const lessons = await this.prisma.lesson.findMany({
      where: {
        roomId: { not: null },
        ...(query.branchId ? { room: { branchId: query.branchId } } : {}),
        startsAt: { lt: to },
        OR: [
          { endsAt: { gt: from } },
          { endsAt: null, startsAt: { gte: from } },
        ],
      },
      orderBy: { startsAt: 'asc' },
      select: occupancyLessonSelect,
    });

    // Bucket overlapping lessons by room id.
    const lessonsByRoom = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      if (!lesson.roomId) continue;
      const bucket = lessonsByRoom.get(lesson.roomId);
      if (bucket) bucket.push(lesson);
      else lessonsByRoom.set(lesson.roomId, [lesson]);
    }

    const items = rooms.map((room) => {
      const roomLessons = lessonsByRoom.get(room.id) ?? [];
      return {
        room,
        occupied: roomLessons.length > 0,
        lessons: roomLessons,
      };
    });

    return {
      window: { from, to },
      items,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the occupancy window. Explicit `from`+`to` wins; otherwise `date`
   * expands to that whole UTC calendar day. Requires at least one valid form and
   * a strictly positive range (→ 400).
   */
  private resolveOccupancyWindow(query: RoomOccupancyQueryDto): {
    from: Date;
    to: Date;
  } {
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      if (to <= from) {
        throw new BadRequestException('`to` must be after `from`');
      }
      return { from, to };
    }

    if (query.date) {
      const d = new Date(query.date);
      const from = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    }

    throw new BadRequestException(
      'Provide a `date` or both `from` and `to` for the occupancy window',
    );
  }

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

  private async assertRoomExists(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
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
