import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../../common/dto/pagination.dto';
import { computeBillingPeriod } from '../../../common/utils/billing-period';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { GeneratePaymentDto } from './dto/generate-payment.dto';
import { PayPaymentDto } from './dto/pay-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryDebtsDto } from './dto/query-debts.dto';

/** Shape of one student's aggregated debt in the debts report. */
export interface StudentDebt {
  studentId: string;
  studentName: string;
  branchId: string;
  unpaidPeriods: number;
  amountDue: number;
  payments: {
    id: string;
    billingMonthStart: Date;
    billingMonthEnd: Date;
    amount: number;
  }[];
}

/** Debts report envelope. */
export interface DebtsReport {
  totalDebt: number;
  byStudent: StudentDebt[];
}

/**
 * Payments: monthly tuition anchored to `Student.enrollmentDate` (NOT the
 * calendar month). An elapsed UNPAID period is a debt. FOUNDER-only (guarded at
 * the controller).
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPaymentDto): Promise<PaginatedResult<Payment>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { billingMonthStart: 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  /**
   * Generate/upsert current-period payments from enrollmentDate.
   *
   * For each targeted active membership (student × group), compute the billing
   * period containing `ref` and upsert a Payment on the unique key
   * (studentId, groupId, billingMonthStart). The amount is the group's course
   * `pricePerMonth`. Existing rows are returned unchanged (idempotent) — we only
   * fill in period/amount on create so a paid row is never clobbered.
   */
  async generate(dto: GeneratePaymentDto): Promise<Payment[]> {
    const ref = dto.ref ? new Date(dto.ref) : new Date();

    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.studentId },
        select: { id: true },
      });
      if (!student)
        throw new NotFoundException(`Student ${dto.studentId} not found`);
    }

    // Active memberships (leftAt = null) matching the requested scope, joined to
    // the group's course price and the student's enrollment/branch anchors.
    const memberships = await this.prisma.groupStudent.findMany({
      where: {
        leftAt: null,
        ...(dto.studentId ? { studentId: dto.studentId } : {}),
        ...(dto.groupId ? { groupId: dto.groupId } : {}),
        student: { isActive: true },
      },
      select: {
        groupId: true,
        studentId: true,
        student: {
          select: { id: true, enrollmentDate: true, branchId: true },
        },
        group: {
          select: { id: true, course: { select: { pricePerMonth: true } } },
        },
      },
    });

    const results: Payment[] = [];

    for (const m of memberships) {
      const price = m.group.course?.pricePerMonth;
      // Skip memberships with no resolvable price.
      if (price === undefined || price === null) continue;

      const { start, end } = computeBillingPeriod(
        m.student.enrollmentDate,
        ref,
      );

      const payment = await this.prisma.payment.upsert({
        where: {
          studentId_groupId_billingMonthStart: {
            studentId: m.studentId,
            groupId: m.groupId,
            billingMonthStart: start,
          },
        },
        create: {
          studentId: m.studentId,
          groupId: m.groupId,
          branchId: m.student.branchId,
          amount: price,
          billingMonthStart: start,
          billingMonthEnd: end,
          status: PaymentStatus.UNPAID,
        },
        // Idempotent: never overwrite an existing (possibly PAID) row.
        update: {},
      });

      results.push(payment);
    }

    return results;
  }

  /** Mark a payment PAID (paidAt defaults to now). */
  async pay(id: string, dto: PayPaymentDto): Promise<Payment> {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
    });
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    await this.findOne(id);

    const data: Prisma.PaymentUpdateInput = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.status !== undefined) {
      data.status = dto.status;
      // Keep paidAt consistent with status when the caller doesn't set it.
      if (dto.status === PaymentStatus.PAID && dto.paidAt === undefined) {
        data.paidAt = new Date();
      } else if (dto.status === PaymentStatus.UNPAID) {
        data.paidAt = null;
      }
    }
    if (dto.paidAt !== undefined) data.paidAt = new Date(dto.paidAt);

    return this.prisma.payment.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Payment> {
    await this.findOne(id);
    return this.prisma.payment.delete({ where: { id } });
  }

  /**
   * Debts report: UNPAID payments whose period has fully elapsed
   * (`billingMonthEnd <= asOf`), grouped by student.
   */
  async findDebts(query: QueryDebtsDto): Promise<DebtsReport> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    const where: Prisma.PaymentWhereInput = {
      status: PaymentStatus.UNPAID,
      billingMonthEnd: { lte: asOf },
    };
    if (query.branchId) where.branchId = query.branchId;
    if (query.studentId) where.studentId = query.studentId;

    const rows = await this.prisma.payment.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { billingMonthStart: 'asc' },
    });

    const byStudentMap = new Map<string, StudentDebt>();
    let totalDebt = 0;

    for (const row of rows) {
      if (!row.billingMonthStart || !row.billingMonthEnd) continue;
      const amount = Number(row.amount);
      totalDebt += amount;

      let entry = byStudentMap.get(row.studentId);
      if (!entry) {
        const name = row.student
          ? `${row.student.firstName} ${row.student.lastName}`.trim()
          : '';
        entry = {
          studentId: row.studentId,
          studentName: name,
          branchId: row.branchId,
          unpaidPeriods: 0,
          amountDue: 0,
          payments: [],
        };
        byStudentMap.set(row.studentId, entry);
      }

      entry.unpaidPeriods += 1;
      entry.amountDue += amount;
      entry.payments.push({
        id: row.id,
        billingMonthStart: row.billingMonthStart,
        billingMonthEnd: row.billingMonthEnd,
        amount,
      });
    }

    return {
      totalDebt: round2(totalDebt),
      byStudent: Array.from(byStudentMap.values()).map((e) => ({
        ...e,
        amountDue: round2(e.amountDue),
      })),
    };
  }

  private buildWhere(query: QueryPaymentDto): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.groupId) where.groupId = query.groupId;

    if (query.from || query.to) {
      where.billingMonthStart = {};
      if (query.from) where.billingMonthStart.gte = new Date(query.from);
      if (query.to) where.billingMonthStart.lte = new Date(query.to);
    }

    return where;
  }
}

/** Round to 2 decimal places to avoid float artefacts in summed money. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
