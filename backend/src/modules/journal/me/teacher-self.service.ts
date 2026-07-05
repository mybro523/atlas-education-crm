import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScheduleQueryDto } from '../dto/schedule-query.dto';
import { TeacherStudentsQueryDto } from '../dto/teacher-students-query.dto';

@Injectable()
export class TeacherSelfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the Teacher profile linked to the caller. TEACHER self endpoints
   * throw 404 if the user has no linked teacher record.
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

  /** Own groups with course and active-member counts. */
  async getGroups(userId: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const groups = await this.prisma.group.findMany({
      where: { teacherId },
      select: {
        id: true,
        name: true,
        isActive: true,
        branchId: true,
        course: { select: { id: true, name: true } },
        _count: {
          select: {
            students: { where: { leftAt: null } },
            lessons: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      isActive: g.isActive,
      branchId: g.branchId,
      course: g.course,
      studentsCount: g._count.students,
      lessonsCount: g._count.lessons,
    }));
  }

  /**
   * Distinct active students across the teacher's groups. Includes student and
   * parent phones (teachers may contact students/parents per spec §4.2).
   * Optional filters: a single group and free-text name search.
   */
  async getStudents(userId: string, query: TeacherStudentsQueryDto) {
    const teacherId = await this.resolveTeacherId(userId);

    // Group filter: if provided, ensure it is the teacher's own group.
    const groupFilter: Prisma.GroupWhereInput = { teacherId };
    if (query.groupId) {
      groupFilter.id = query.groupId;
    }

    const studentWhere: Prisma.StudentWhereInput = {
      groupLinks: { some: { leftAt: null, group: groupFilter } },
    };
    if (query.search) {
      studentWhere.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        branchId: true,
        parents: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        // Active memberships in THIS teacher's groups only — powers the
        // per-student group badges (MyTeacherStudent.groups) on the frontend.
        groupLinks: {
          where: { leftAt: null, group: { teacherId } },
          select: { group: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      middleName: s.middleName,
      phone: s.phone,
      branchId: s.branchId,
      parents: s.parents,
      groups: s.groupLinks.map((link) => ({
        id: link.group.id,
        name: link.group.name,
      })),
    }));
  }

  /** Own lessons within an optional date range. */
  async getSchedule(userId: string, query: ScheduleQueryDto) {
    const teacherId = await this.resolveTeacherId(userId);

    const where: Prisma.LessonWhereInput = { teacherId };
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
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
