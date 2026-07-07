import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { QueryStudentPaymentDto } from './dto/query-student-payment.dto';
import { QueryUpcomingDto } from './dto/query-upcoming.dto';

/**
 * Add `months` calendar months to a date, clamping the day-of-month so e.g.
 * Jan 31 + 1mo lands on the last day of February instead of rolling into March.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** One row of the "subscription ending soon" panel. */
export interface UpcomingPaymentRow {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    phone: string | null;
  };
  branch: { id: string; name: string } | null;
  /** Monthly fee the student is billed (courseFee ?? course price). */
  monthlyFee: number;
  /** Total of PAID payments. */
  paidAmount: number;
  /** Whole months covered by what was paid. */
  monthsCovered: number;
  /** When the paid-for period runs out (billing anchored to enrollmentDate). */
  endsAt: string;
  /** Days until endsAt (negative = overdue). */
  daysLeft: number;
  overdue: boolean;
}

/** Include shape shared by both endpoints — student/group/branch summaries. */
const PAYMENT_INCLUDE = {
  student: { select: { id: true, firstName: true, lastName: true } },
  group: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

/**
 * Student subscription payments — ad-hoc PAID payments recorded on demand.
 *
 * Separate from the FOUNDER-only monthly billing in the finance module: these
 * carry no billing month and are always created already PAID. FOUNDER + ADMIN
 * (guarded at the controller).
 */
@Injectable()
export class StudentPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Record a PAID subscription payment for a student.
   *
   * Resolves the student's branch and their single ACTIVE group membership
   * (GroupStudent.leftAt = null) as the (nullable) groupId. No billing month.
   */
  async create(dto: CreateStudentPaymentDto): Promise<Payment> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, branchId: true },
    });
    if (!student)
      throw new NotFoundException(`Student ${dto.studentId} not found`);

    // The student's single active membership resolves the group (may be none).
    const membership = await this.prisma.groupStudent.findFirst({
      where: { studentId: dto.studentId, leftAt: null },
      select: { groupId: true },
    });

    return this.prisma.payment.create({
      data: {
        studentId: student.id,
        groupId: membership?.groupId ?? null,
        branchId: student.branchId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        billingMonthStart: null,
        billingMonthEnd: null,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  /** Paginated history, ordered by paidAt desc, with student/group/branch. */
  async findAll(
    query: QueryStudentPaymentDto,
  ): Promise<PaginatedResult<Payment>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { paidAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  /**
   * Students whose paid-for subscription period ends within `days` days (or has
   * already ended) — so the admin knows who must pay for the next month.
   *
   * The billing month is anchored to the student's enrollmentDate (spec: the
   * payment month counts from the joining date, not the calendar month):
   * monthsCovered = floor(totalPaid / monthlyFee) and the covered period runs
   * until enrollmentDate + monthsCovered months. Sorted soonest-first.
   */
  async findUpcoming(query: QueryUpcomingDto): Promise<UpcomingPaymentRow[]> {
    const days =
      query.days ?? (await this.settings.getNumber('paymentDueDays', 3));

    const students = await this.prisma.student.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        enrollmentDate: true,
        courseFee: true,
        course: { select: { pricePerMonth: true } },
        branch: { select: { id: true, name: true } },
        payments: {
          where: { status: PaymentStatus.PAID },
          select: { amount: true },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + days);

    const rows: UpcomingPaymentRow[] = [];
    for (const s of students) {
      const monthlyFee =
        s.courseFee != null
          ? Number(s.courseFee)
          : s.course?.pricePerMonth != null
            ? Number(s.course.pricePerMonth)
            : 0;
      // Students without a fee have no subscription to run out.
      if (monthlyFee <= 0) continue;

      const paidAmount = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const monthsCovered = Math.floor(paidAmount / monthlyFee);
      const endsAt = addMonthsClamped(s.enrollmentDate, monthsCovered);
      endsAt.setHours(0, 0, 0, 0);

      if (endsAt > horizon) continue;

      const daysLeft = Math.round(
        (endsAt.getTime() - today.getTime()) / 86_400_000,
      );
      rows.push({
        student: {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          middleName: s.middleName,
          phone: s.phone,
        },
        branch: s.branch,
        monthlyFee,
        paidAmount,
        monthsCovered,
        endsAt: endsAt.toISOString(),
        daysLeft,
        overdue: daysLeft < 0,
      });
    }

    rows.sort((a, b) => a.daysLeft - b.daysLeft);
    return rows;
  }

  private buildWhere(query: QueryStudentPaymentDto): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.method) where.method = query.method;

    if (query.search) {
      where.student = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.from || query.to) {
      where.paidAt = {};
      if (query.from) where.paidAt.gte = new Date(query.from);
      if (query.to) where.paidAt.lte = new Date(query.to);
    }

    return where;
  }
}
