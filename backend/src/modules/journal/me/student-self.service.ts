import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GradesQueryDto } from '../dto/grades-query.dto';
import { ScheduleQueryDto } from '../dto/schedule-query.dto';

/** Per-subject performance row. */
export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  averageGrade: number | null;
  gradesCount: number;
  absences: number;
  lates: number;
  present: number;
}

/** Aggregate student performance response. */
export interface StudentPerformance {
  bySubject: SubjectPerformance[];
  overall: { averageGrade: number | null; totalAbsences: number };
}

@Injectable()
export class StudentSelfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the Student profile linked to the caller. STUDENT self endpoints
   * throw 404 if the user has no linked student record.
   */
  private async resolveStudentId(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found for current user');
    }
    return student.id;
  }

  /** Own profile with parents and current group memberships. */
  async getProfile(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        branch: { select: { id: true, name: true } },
        parents: true,
        groupLinks: {
          where: { leftAt: null },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                subject: { select: { id: true, name: true } },
                teacher: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found for current user');
    }
    return student;
  }

  /** Own grades, newest first, with optional subject / date-range filters. */
  async getGrades(userId: string, query: GradesQueryDto) {
    const studentId = await this.resolveStudentId(userId);

    const lessonWhere: Prisma.LessonWhereInput = {};
    if (query.subjectId) {
      lessonWhere.group = { subjectId: query.subjectId };
    }
    if (query.from || query.to) {
      lessonWhere.startsAt = {};
      if (query.from) lessonWhere.startsAt.gte = new Date(query.from);
      if (query.to) lessonWhere.startsAt.lte = new Date(query.to);
    }

    const where: Prisma.GradeWhereInput = { studentId };
    if (Object.keys(lessonWhere).length > 0) {
      where.lesson = lessonWhere;
    }

    return this.prisma.grade.findMany({
      where,
      select: {
        id: true,
        value: true,
        comment: true,
        createdAt: true,
        lesson: {
          select: {
            id: true,
            startsAt: true,
            topic: true,
            group: {
              select: {
                id: true,
                name: true,
                subject: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Own schedule (lessons of the student's active groups) within a range. */
  async getSchedule(userId: string, query: ScheduleQueryDto) {
    const studentId = await this.resolveStudentId(userId);

    const where: Prisma.LessonWhereInput = {
      group: { students: { some: { studentId, leftAt: null } } },
    };
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lte = new Date(query.to);
    }

    return this.prisma.lesson.findMany({
      where,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        topic: true,
        room: true,
        isConducted: true,
        group: {
          select: {
            id: true,
            name: true,
            subject: { select: { id: true, name: true } },
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /**
   * Per-subject average grade + attendance counts, plus an overall summary.
   * Grades are averaged per subject; attendance counts (present/absent/late)
   * come from the student's Attendance rows grouped by the lesson's subject.
   */
  async getPerformance(userId: string): Promise<StudentPerformance> {
    const studentId = await this.resolveStudentId(userId);

    // Pull grades with their subject (via lesson → group → subject).
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      select: {
        value: true,
        lesson: {
          select: {
            group: {
              select: { subject: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Pull attendance with the same subject linkage.
    const attendances = await this.prisma.attendance.findMany({
      where: { studentId },
      select: {
        status: true,
        lesson: {
          select: {
            group: {
              select: { subject: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Accumulate per-subject stats.
    interface Acc {
      subjectId: string;
      subjectName: string;
      gradeSum: number;
      gradesCount: number;
      absences: number;
      lates: number;
      present: number;
    }
    const bySubject = new Map<string, Acc>();

    const ensure = (id: string, name: string): Acc => {
      let acc = bySubject.get(id);
      if (!acc) {
        acc = {
          subjectId: id,
          subjectName: name,
          gradeSum: 0,
          gradesCount: 0,
          absences: 0,
          lates: 0,
          present: 0,
        };
        bySubject.set(id, acc);
      }
      return acc;
    };

    let gradeSumAll = 0;
    let gradesCountAll = 0;
    for (const g of grades) {
      const subject = g.lesson.group.subject;
      const acc = ensure(subject.id, subject.name);
      acc.gradeSum += g.value;
      acc.gradesCount += 1;
      gradeSumAll += g.value;
      gradesCountAll += 1;
    }

    let totalAbsences = 0;
    for (const a of attendances) {
      const subject = a.lesson.group.subject;
      const acc = ensure(subject.id, subject.name);
      if (a.status === 'ABSENT') {
        acc.absences += 1;
        totalAbsences += 1;
      } else if (a.status === 'LATE') {
        acc.lates += 1;
      } else {
        acc.present += 1;
      }
    }

    const rows: SubjectPerformance[] = Array.from(bySubject.values()).map(
      (acc) => ({
        subjectId: acc.subjectId,
        subjectName: acc.subjectName,
        averageGrade:
          acc.gradesCount > 0
            ? Number((acc.gradeSum / acc.gradesCount).toFixed(2))
            : null,
        gradesCount: acc.gradesCount,
        absences: acc.absences,
        lates: acc.lates,
        present: acc.present,
      }),
    );

    return {
      bySubject: rows,
      overall: {
        averageGrade:
          gradesCountAll > 0
            ? Number((gradeSumAll / gradesCountAll).toFixed(2))
            : null,
        totalAbsences,
      },
    };
  }
}
