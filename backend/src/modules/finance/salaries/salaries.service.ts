import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Salary, SalaryBasis, SalaryStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../../common/dto/pagination.dto';
import { ComputeSalaryDto } from './dto/compute-salary.dto';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { QuerySalaryDto } from './dto/query-salary.dto';

/** One lesson's contribution to a computed salary. */
export interface SalaryLessonLine {
  lessonId: string;
  startsAt: Date;
  payRate: number;
}

/** Result of a per-lesson salary computation for a teacher over a period. */
export interface SalaryComputation {
  teacherId: string;
  periodStart: Date;
  periodEnd: Date;
  basis: 'PER_LESSON';
  lessonsCount: number;
  amount: number;
  lessons: SalaryLessonLine[];
}

/**
 * Salaries. Teacher pay is FLEXIBLE per conducted lesson (§0.6):
 *   salary = Σ payRate(lesson) over the teacher's conducted lessons in [from,to]
 *   payRate(lesson) = lesson.teacherPayRate ?? lesson.lessonRate.amount ?? 0
 * Admin staff salary is fixed (Employee.baseSalary, basis=FIXED).
 * FOUNDER-only (guarded at the controller).
 */
@Injectable()
export class SalariesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySalaryDto): Promise<PaginatedResult<Salary>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salary.findMany({
        where,
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { periodStart: 'desc' },
        skip,
        take,
      }),
      this.prisma.salary.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<Salary> {
    const salary = await this.prisma.salary.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!salary) throw new NotFoundException(`Salary ${id} not found`);
    return salary;
  }

  /**
   * Compute a teacher's per-lesson salary for [from, to]. If `persist` is true,
   * a PER_LESSON / PENDING Salary row is created and returned alongside.
   */
  async compute(
    dto: ComputeSalaryDto,
  ): Promise<SalaryComputation & { salary?: Salary }> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
      select: { id: true },
    });
    if (!teacher)
      throw new NotFoundException(`Teacher ${dto.teacherId} not found`);

    const from = new Date(dto.from);
    const to = new Date(dto.to);

    const lessons = await this.prisma.lesson.findMany({
      where: {
        teacherId: dto.teacherId,
        isConducted: true,
        startsAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        startsAt: true,
        teacherPayRate: true,
        lessonRate: { select: { amount: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    const lines: SalaryLessonLine[] = lessons.map((l) => {
      // payRate = lesson override ?? linked rate ?? 0
      const rate =
        l.teacherPayRate ?? l.lessonRate?.amount ?? new Prisma.Decimal(0);
      return {
        lessonId: l.id,
        startsAt: l.startsAt,
        payRate: Number(rate),
      };
    });

    const amount = round2(lines.reduce((sum, l) => sum + l.payRate, 0));

    const computation: SalaryComputation = {
      teacherId: dto.teacherId,
      periodStart: from,
      periodEnd: to,
      basis: 'PER_LESSON',
      lessonsCount: lines.length,
      amount,
      lessons: lines,
    };

    if (dto.persist) {
      const salary = await this.prisma.salary.create({
        data: {
          teacherId: dto.teacherId,
          basis: SalaryBasis.PER_LESSON,
          periodStart: from,
          periodEnd: to,
          amount: new Prisma.Decimal(amount),
          status: SalaryStatus.PENDING,
        },
      });
      return { ...computation, salary };
    }

    return computation;
  }

  /** Persist a salary row (from a computation or a fixed admin amount). */
  async create(dto: CreateSalaryDto): Promise<Salary> {
    // Exactly one of teacher / employee.
    const hasTeacher = !!dto.teacherId;
    const hasEmployee = !!dto.employeeId;
    if (hasTeacher === hasEmployee) {
      throw new BadRequestException(
        'Exactly one of teacherId or employeeId must be provided',
      );
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: dto.teacherId },
        select: { id: true },
      });
      if (!teacher)
        throw new NotFoundException(`Teacher ${dto.teacherId} not found`);
    }
    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
        select: { id: true },
      });
      if (!employee)
        throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const status = dto.status ?? SalaryStatus.PENDING;
    return this.prisma.salary.create({
      data: {
        teacherId: dto.teacherId ?? null,
        employeeId: dto.employeeId ?? null,
        basis: dto.basis,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        amount: new Prisma.Decimal(dto.amount),
        status,
        // If created already PAID, stamp paidAt.
        paidAt: status === SalaryStatus.PAID ? new Date() : null,
      },
    });
  }

  /** Mark a salary PAID (paidAt = now). */
  async pay(id: string): Promise<Salary> {
    await this.findOne(id);
    return this.prisma.salary.update({
      where: { id },
      data: { status: SalaryStatus.PAID, paidAt: new Date() },
    });
  }

  async update(id: string, dto: UpdateSalaryDto): Promise<Salary> {
    await this.findOne(id);

    const data: Prisma.SalaryUpdateInput = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === SalaryStatus.PAID && dto.paidAt === undefined) {
        data.paidAt = new Date();
      } else if (dto.status === SalaryStatus.PENDING) {
        data.paidAt = null;
      }
    }
    if (dto.paidAt !== undefined) data.paidAt = new Date(dto.paidAt);

    return this.prisma.salary.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Salary> {
    await this.findOne(id);
    return this.prisma.salary.delete({ where: { id } });
  }

  private buildWhere(query: QuerySalaryDto): Prisma.SalaryWhereInput {
    const where: Prisma.SalaryWhereInput = {};
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.from) where.periodStart = { gte: new Date(query.from) };
    if (query.to) where.periodEnd = { lte: new Date(query.to) };
    return where;
  }
}

/** Round to 2 decimal places to avoid float artefacts in summed money. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
