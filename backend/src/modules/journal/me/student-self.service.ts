import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GradesQueryDto } from '../dto/grades-query.dto';
import { ScheduleQueryDto } from '../dto/schedule-query.dto';

/** Per-course performance row. */
export interface CoursePerformance {
  courseId: string;
  courseName: string;
  averageGrade: number | null;
  gradesCount: number;
  absences: number;
  lates: number;
  present: number;
}

/** Aggregate student performance response. */
export interface StudentPerformance {
  byCourse: CoursePerformance[];
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
                course: { select: { id: true, name: true } },
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

  /** Own grades, newest first, with optional course / date-range filters. */
  async getGrades(userId: string, query: GradesQueryDto) {
    const studentId = await this.resolveStudentId(userId);

    const lessonWhere: Prisma.LessonWhereInput = {};
    if (query.courseId) {
      lessonWhere.group = { courseId: query.courseId };
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
            group: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
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
        room: { select: { id: true, name: true } },
        isConducted: true,
        group: {
          select: {
            id: true,
            name: true,
            course: { select: { id: true, name: true } },
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /**
   * Per-course average grade + attendance counts, plus an overall summary.
   * Grades are averaged per course; attendance counts (present/absent/late)
   * come from the student's Attendance rows grouped by the lesson's course
   * (via lesson → group → course).
   */
  async getPerformance(userId: string): Promise<StudentPerformance> {
    const studentId = await this.resolveStudentId(userId);

    // Pull grades with their course (via lesson → group → course).
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      select: {
        value: true,
        lesson: {
          select: {
            group: {
              select: { course: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Pull attendance with the same course linkage.
    const attendances = await this.prisma.attendance.findMany({
      where: { studentId },
      select: {
        status: true,
        lesson: {
          select: {
            group: {
              select: { course: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Accumulate per-course stats.
    interface Acc {
      courseId: string;
      courseName: string;
      gradeSum: number;
      gradesCount: number;
      absences: number;
      lates: number;
      present: number;
    }
    const byCourse = new Map<string, Acc>();

    const ensure = (id: string, name: string): Acc => {
      let acc = byCourse.get(id);
      if (!acc) {
        acc = {
          courseId: id,
          courseName: name,
          gradeSum: 0,
          gradesCount: 0,
          absences: 0,
          lates: 0,
          present: 0,
        };
        byCourse.set(id, acc);
      }
      return acc;
    };

    let gradeSumAll = 0;
    let gradesCountAll = 0;
    for (const g of grades) {
      const course = g.lesson.group.course;
      const acc = ensure(course.id, course.name);
      acc.gradeSum += g.value;
      acc.gradesCount += 1;
      gradeSumAll += g.value;
      gradesCountAll += 1;
    }

    let totalAbsences = 0;
    for (const a of attendances) {
      const course = a.lesson.group.course;
      const acc = ensure(course.id, course.name);
      if (a.status === 'ABSENT') {
        acc.absences += 1;
        totalAbsences += 1;
      } else if (a.status === 'LATE') {
        acc.lates += 1;
      } else {
        acc.present += 1;
      }
    }

    const rows: CoursePerformance[] = Array.from(byCourse.values()).map(
      (acc) => ({
        courseId: acc.courseId,
        courseName: acc.courseName,
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
      byCourse: rows,
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
