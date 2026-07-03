import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Attendance, Grade, Lesson, Remark } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { CreateRemarkDto } from './dto/create-remark.dto';
import { ListRemarksQueryDto } from './dto/list-remarks.query.dto';

/** One cell of the group journal matrix (per student × lesson). */
export interface JournalCell {
  grade: number | null;
  gradeComment: string | null;
  attendance: string | null;
  remarks: number;
}

/** Full group-journal matrix response shape. */
export interface JournalMatrix {
  group: { id: string; name: string; subjectId: string; teacherId: string | null };
  lessons: Array<{
    id: string;
    startsAt: Date;
    topic: string | null;
    isConducted: boolean;
  }>;
  students: Array<{
    student: { id: string; firstName: string; lastName: string };
    cells: Record<string, JournalCell>;
  }>;
}

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Ownership helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve the Teacher profile linked to a user, or throw 404 if the caller
   * (a TEACHER) has no linked teacher record.
   */
  private async resolveTeacherId(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found for current user');
    }
    return teacher.id;
  }

  /**
   * Assert the caller may write to / read the journal of a given group.
   * ADMIN & FOUNDER may touch any group; a TEACHER only their own groups.
   * Returns the group (id, teacherId) so callers can reuse it.
   */
  private async assertGroupAccess(
    user: AuthUser,
    groupId: string,
  ): Promise<{ id: string; teacherId: string | null }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, teacherId: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) {
      return group;
    }

    // TEACHER: must own the group.
    const teacherId = await this.resolveTeacherId(user.id);
    if (group.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this group');
    }
    return group;
  }

  /**
   * Load a lesson (with its group) and assert journal-write access for it.
   * Used by grade/attendance/remark writes where the target is a lesson.
   */
  private async assertLessonAccess(
    user: AuthUser,
    lessonId: string,
  ): Promise<{ id: string; groupId: string; group: { teacherId: string | null } }> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, groupId: true, group: { select: { teacherId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) {
      return lesson;
    }

    const teacherId = await this.resolveTeacherId(user.id);
    if (lesson.group.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this lesson');
    }
    return lesson;
  }

  /**
   * Assert the given student belongs (currently or historically) to a group the
   * caller may access. Prevents a teacher grading a student outside their group.
   * For a lesson-scoped write we ensure the student is a member of the lesson's
   * group.
   */
  private async assertStudentInGroup(
    studentId: string,
    groupId: string,
  ): Promise<void> {
    const link = await this.prisma.groupStudent.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
      select: { studentId: true },
    });
    if (!link) {
      throw new NotFoundException('Student is not a member of the lesson group');
    }
  }

  // -------------------------------------------------------------------------
  // Grades
  // -------------------------------------------------------------------------

  /** Upsert a grade on the (student, lesson) unique pair. */
  async upsertGrade(user: AuthUser, dto: UpsertGradeDto): Promise<Grade> {
    const lesson = await this.assertLessonAccess(user, dto.lessonId);
    await this.assertStudentInGroup(dto.studentId, lesson.groupId);

    return this.prisma.grade.upsert({
      where: {
        studentId_lessonId: {
          studentId: dto.studentId,
          lessonId: dto.lessonId,
        },
      },
      create: {
        studentId: dto.studentId,
        lessonId: dto.lessonId,
        value: dto.value,
        comment: dto.comment ?? null,
        authorId: user.id,
      },
      update: {
        value: dto.value,
        comment: dto.comment ?? null,
        authorId: user.id,
      },
    });
  }

  /** Delete a grade for a (student, lesson) pair. */
  async deleteGrade(
    user: AuthUser,
    studentId: string,
    lessonId: string,
  ): Promise<{ deleted: true }> {
    await this.assertLessonAccess(user, lessonId);
    const existing = await this.prisma.grade.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Grade not found');
    }
    await this.prisma.grade.delete({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------------------

  /** Upsert attendance on the (student, lesson) unique pair. */
  async upsertAttendance(
    user: AuthUser,
    dto: UpsertAttendanceDto,
  ): Promise<Attendance> {
    const lesson = await this.assertLessonAccess(user, dto.lessonId);
    await this.assertStudentInGroup(dto.studentId, lesson.groupId);

    return this.prisma.attendance.upsert({
      where: {
        studentId_lessonId: {
          studentId: dto.studentId,
          lessonId: dto.lessonId,
        },
      },
      create: {
        studentId: dto.studentId,
        lessonId: dto.lessonId,
        status: dto.status,
      },
      update: {
        status: dto.status,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Remarks
  // -------------------------------------------------------------------------

  /** Create a remark (optionally tied to a lesson). authorId = current user. */
  async createRemark(user: AuthUser, dto: CreateRemarkDto): Promise<Remark> {
    if (dto.lessonId) {
      // Lesson-scoped remark: verify lesson access and membership.
      const lesson = await this.assertLessonAccess(user, dto.lessonId);
      await this.assertStudentInGroup(dto.studentId, lesson.groupId);
    } else {
      // Free remark: verify the student exists and, for a TEACHER, that the
      // student belongs to one of the teacher's groups.
      await this.assertStudentAccess(user, dto.studentId);
    }

    return this.prisma.remark.create({
      data: {
        studentId: dto.studentId,
        lessonId: dto.lessonId ?? null,
        text: dto.text,
        authorId: user.id,
      },
    });
  }

  /**
   * Assert the caller may act on a student (for lesson-less remarks / lists).
   * ADMIN/FOUNDER: any student. TEACHER: student must be in one of their groups.
   */
  private async assertStudentAccess(
    user: AuthUser,
    studentId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === Role.ADMIN || user.role === Role.FOUNDER) {
      return;
    }

    const teacherId = await this.resolveTeacherId(user.id);
    const membership = await this.prisma.groupStudent.findFirst({
      where: { studentId, group: { teacherId } },
      select: { studentId: true },
    });
    if (!membership) {
      throw new ForbiddenException('Student is not in any of your groups');
    }
  }

  /** List remarks with optional filters; TEACHER scoped to their own groups. */
  async listRemarks(
    user: AuthUser,
    query: ListRemarksQueryDto,
  ): Promise<Remark[]> {
    // Base filters from the query.
    const where: Record<string, unknown> = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.lessonId) where.lessonId = query.lessonId;
    if (query.groupId) {
      await this.assertGroupAccess(user, query.groupId);
      where.lesson = { groupId: query.groupId };
    }

    // Scope a TEACHER to remarks that touch their own groups: either the remark
    // is on a lesson of one of their groups, OR the student is a member of one
    // of their groups (covers lesson-less remarks).
    if (user.role === Role.TEACHER) {
      const teacherId = await this.resolveTeacherId(user.id);
      where.OR = [
        { lesson: { group: { teacherId } } },
        { student: { groupLinks: { some: { group: { teacherId } } } } },
      ];
    }

    return this.prisma.remark.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        lesson: { select: { id: true, startsAt: true, topic: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Delete a remark; TEACHER may only delete remarks in their own groups. */
  async deleteRemark(user: AuthUser, id: string): Promise<{ deleted: true }> {
    const remark = await this.prisma.remark.findUnique({
      where: { id },
      select: { id: true, studentId: true, lessonId: true },
    });
    if (!remark) {
      throw new NotFoundException('Remark not found');
    }

    if (user.role === Role.TEACHER) {
      if (remark.lessonId) {
        await this.assertLessonAccess(user, remark.lessonId);
      } else {
        await this.assertStudentAccess(user, remark.studentId);
      }
    }

    await this.prisma.remark.delete({ where: { id } });
    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // Group journal matrix
  // -------------------------------------------------------------------------

  /**
   * Build the students × lessons matrix for a group: each cell carries the
   * grade value, attendance status and a remark count for that student+lesson.
   */
  async getGroupMatrix(user: AuthUser, groupId: string): Promise<JournalMatrix> {
    await this.assertGroupAccess(user, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, subjectId: true, teacherId: true },
    });
    // assertGroupAccess already guarantees existence.
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Lessons of the group, chronological.
    const lessons = await this.prisma.lesson.findMany({
      where: { groupId },
      select: { id: true, startsAt: true, topic: true, isConducted: true },
      orderBy: { startsAt: 'asc' },
    });
    const lessonIds = lessons.map((l) => l.id);

    // Active members of the group (not left).
    const memberLinks = await this.prisma.groupStudent.findMany({
      where: { groupId, leftAt: null },
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { lastName: 'asc' } },
    });
    const students = memberLinks.map((m) => m.student);
    const studentIds = students.map((s) => s.id);

    // Bulk-load journal data for these students×lessons, then index it.
    const [grades, attendances, remarks] = await Promise.all([
      lessonIds.length && studentIds.length
        ? this.prisma.grade.findMany({
            where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
            select: {
              studentId: true,
              lessonId: true,
              value: true,
              comment: true,
            },
          })
        : Promise.resolve([]),
      lessonIds.length && studentIds.length
        ? this.prisma.attendance.findMany({
            where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
            select: { studentId: true, lessonId: true, status: true },
          })
        : Promise.resolve([]),
      lessonIds.length && studentIds.length
        ? this.prisma.remark.groupBy({
            by: ['studentId', 'lessonId'],
            where: {
              lessonId: { in: lessonIds },
              studentId: { in: studentIds },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    // Index by `${studentId}:${lessonId}`.
    const key = (s: string, l: string): string => `${s}:${l}`;

    const gradeByKey = new Map<string, { value: number; comment: string | null }>();
    for (const g of grades) {
      gradeByKey.set(key(g.studentId, g.lessonId), {
        value: g.value,
        comment: g.comment,
      });
    }

    const attByKey = new Map<string, string>();
    for (const a of attendances) {
      attByKey.set(key(a.studentId, a.lessonId), a.status);
    }

    const remarkByKey = new Map<string, number>();
    for (const r of remarks) {
      if (r.lessonId) {
        remarkByKey.set(key(r.studentId, r.lessonId), r._count._all);
      }
    }

    // Assemble the per-student cell maps.
    const studentRows = students.map((student) => {
      const cells: Record<string, JournalCell> = {};
      for (const lesson of lessons) {
        const k = key(student.id, lesson.id);
        const grade = gradeByKey.get(k);
        cells[lesson.id] = {
          grade: grade ? grade.value : null,
          gradeComment: grade ? grade.comment : null,
          attendance: attByKey.get(k) ?? null,
          remarks: remarkByKey.get(k) ?? 0,
        };
      }
      return { student, cells };
    });

    return { group, lessons, students: studentRows };
  }
}
