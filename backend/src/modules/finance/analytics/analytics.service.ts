import { Injectable } from '@nestjs/common';
import { PaymentStatus, FinanceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalyticsQueryDto,
  AnalyticsSeriesQueryDto,
  SeriesGroupBy,
  SeriesMetric,
} from './dto/analytics-query.dto';

/** Per-branch financial totals. */
export interface BranchTotals {
  branchId: string;
  branchName: string;
  income: number;
  expense: number;
  net: number;
  debt: number;
}

/** Summary response envelope. */
export interface AnalyticsSummary {
  range: { from: string | null; to: string | null };
  combined: { income: number; expense: number; net: number; debt: number };
  byBranch: BranchTotals[];
}

/** One point in a time series. */
export interface SeriesPoint {
  bucket: string;
  value: number;
}

/** Series response envelope. */
export interface AnalyticsSeries {
  metric: SeriesMetric;
  groupBy: SeriesGroupBy;
  combined: SeriesPoint[];
  byBranch: { branchId: string; branchName: string; points: SeriesPoint[] }[];
}

/**
 * Finance analytics (FOUNDER-only, guarded at the controller).
 *
 * Definitions (§15), kept consistent between summary and series:
 *   income  = Σ FinanceRecord(INCOME).amount (by occurredAt)
 *             + Σ PAID Payment.amount        (by paidAt)   — money received
 *   expense = Σ FinanceRecord(EXPENSE).amount (by occurredAt)
 *   debt    = Σ UNPAID Payment.amount whose period elapsed (billingMonthEnd<=to)
 *   net     = income − expense
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: AnalyticsQueryDto): Promise<AnalyticsSummary> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const branches = await this.prisma.branch.findMany({
      where: query.branchId ? { id: query.branchId } : {},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const perBranch = new Map<
      string,
      { income: number; expense: number; debt: number }
    >();
    for (const b of branches)
      perBranch.set(b.id, { income: 0, expense: 0, debt: 0 });

    // --- FinanceRecords (income/expense) grouped by branch+type ---
    const recordAgg = await this.prisma.financeRecord.groupBy({
      by: ['branchId', 'type'],
      where: this.recordWhere(query.branchId, from, to),
      _sum: { amount: true },
    });
    for (const row of recordAgg) {
      const acc = perBranch.get(row.branchId);
      if (!acc) continue;
      const sum = Number(row._sum.amount ?? 0);
      if (row.type === FinanceType.INCOME) acc.income += sum;
      else acc.expense += sum;
    }

    // --- PAID payments (received income) grouped by branch, by paidAt ---
    const paidAgg = await this.prisma.payment.groupBy({
      by: ['branchId'],
      where: this.paidPaymentWhere(query.branchId, from, to),
      _sum: { amount: true },
    });
    for (const row of paidAgg) {
      const acc = perBranch.get(row.branchId);
      if (!acc) continue;
      acc.income += Number(row._sum.amount ?? 0);
    }

    // --- Debt: UNPAID elapsed payments grouped by branch ---
    const debtAgg = await this.prisma.payment.groupBy({
      by: ['branchId'],
      where: this.debtWhere(query.branchId, from, to),
      _sum: { amount: true },
    });
    for (const row of debtAgg) {
      const acc = perBranch.get(row.branchId);
      if (!acc) continue;
      acc.debt += Number(row._sum.amount ?? 0);
    }

    const byBranch: BranchTotals[] = branches.map((b) => {
      const acc = perBranch.get(b.id) ?? { income: 0, expense: 0, debt: 0 };
      return {
        branchId: b.id,
        branchName: b.name,
        income: round2(acc.income),
        expense: round2(acc.expense),
        net: round2(acc.income - acc.expense),
        debt: round2(acc.debt),
      };
    });

    const combined = byBranch.reduce(
      (agg, b) => {
        agg.income += b.income;
        agg.expense += b.expense;
        agg.debt += b.debt;
        return agg;
      },
      { income: 0, expense: 0, debt: 0 },
    );

    return {
      range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
      combined: {
        income: round2(combined.income),
        expense: round2(combined.expense),
        net: round2(combined.income - combined.expense),
        debt: round2(combined.debt),
      },
      byBranch,
    };
  }

  async series(query: AnalyticsSeriesQueryDto): Promise<AnalyticsSeries> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const groupBy: SeriesGroupBy = query.groupBy ?? 'month';
    const metric: SeriesMetric = query.metric ?? 'net';

    const branches = await this.prisma.branch.findMany({
      where: query.branchId ? { id: query.branchId } : {},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const branchIds = new Set(branches.map((b) => b.id));

    // buckets[branchId][bucketKey] = { income, expense, debt }
    const buckets = new Map<
      string,
      Map<string, { income: number; expense: number; debt: number }>
    >();
    for (const b of branches) buckets.set(b.id, new Map());

    const bump = (
      branchId: string,
      when: Date,
      field: 'income' | 'expense' | 'debt',
      amount: number,
    ): void => {
      if (!branchIds.has(branchId)) return;
      const key = bucketKey(when, groupBy);
      const branchBuckets = buckets.get(branchId)!;
      const cell =
        branchBuckets.get(key) ?? { income: 0, expense: 0, debt: 0 };
      cell[field] += amount;
      branchBuckets.set(key, cell);
    };

    const needIncome = metric === 'income' || metric === 'net';
    const needExpense = metric === 'expense' || metric === 'net';
    const needDebt = metric === 'debt';

    // FinanceRecords contribute income and/or expense (bucketed by occurredAt).
    if (needIncome || needExpense) {
      const records = await this.prisma.financeRecord.findMany({
        where: this.recordWhere(query.branchId, from, to),
        select: { branchId: true, type: true, amount: true, occurredAt: true },
      });
      for (const r of records) {
        const amount = Number(r.amount);
        if (needIncome && r.type === FinanceType.INCOME)
          bump(r.branchId, r.occurredAt, 'income', amount);
        if (needExpense && r.type === FinanceType.EXPENSE)
          bump(r.branchId, r.occurredAt, 'expense', amount);
      }
    }

    // PAID payments contribute income (bucketed by paidAt).
    if (needIncome) {
      const paid = await this.prisma.payment.findMany({
        where: this.paidPaymentWhere(query.branchId, from, to),
        select: { branchId: true, amount: true, paidAt: true },
      });
      for (const p of paid) {
        if (!p.paidAt) continue;
        bump(p.branchId, p.paidAt, 'income', Number(p.amount));
      }
    }

    // Debt = UNPAID elapsed payments (bucketed by billingMonthEnd).
    if (needDebt) {
      const debts = await this.prisma.payment.findMany({
        where: this.debtWhere(query.branchId, from, to),
        select: { branchId: true, amount: true, billingMonthEnd: true },
      });
      for (const d of debts) {
        bump(d.branchId, d.billingMonthEnd, 'debt', Number(d.amount));
      }
    }

    const valueOf = (cell: {
      income: number;
      expense: number;
      debt: number;
    }): number => {
      switch (metric) {
        case 'income':
          return cell.income;
        case 'expense':
          return cell.expense;
        case 'debt':
          return cell.debt;
        case 'net':
        default:
          return cell.income - cell.expense;
      }
    };

    // Per-branch series (sorted buckets).
    const byBranch = branches.map((b) => {
      const branchBuckets = buckets.get(b.id)!;
      const points: SeriesPoint[] = Array.from(branchBuckets.entries())
        .sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))
        .map(([bucket, cell]) => ({ bucket, value: round2(valueOf(cell)) }));
      return { branchId: b.id, branchName: b.name, points };
    });

    // Combined series: sum across branches per bucket.
    const combinedMap = new Map<string, number>();
    for (const branch of byBranch) {
      for (const p of branch.points) {
        combinedMap.set(p.bucket, (combinedMap.get(p.bucket) ?? 0) + p.value);
      }
    }
    const combined: SeriesPoint[] = Array.from(combinedMap.entries())
      .sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))
      .map(([bucket, value]) => ({ bucket, value: round2(value) }));

    return { metric, groupBy, combined, byBranch };
  }

  // ---- shared WHERE builders (keep summary & series consistent) ----

  private recordWhere(
    branchId: string | undefined,
    from: Date | undefined,
    to: Date | undefined,
  ): Prisma.FinanceRecordWhereInput {
    const where: Prisma.FinanceRecordWhereInput = {};
    if (branchId) where.branchId = branchId;
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = from;
      if (to) where.occurredAt.lte = to;
    }
    return where;
  }

  private paidPaymentWhere(
    branchId: string | undefined,
    from: Date | undefined,
    to: Date | undefined,
  ): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = { status: PaymentStatus.PAID };
    if (branchId) where.branchId = branchId;
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = from;
      if (to) where.paidAt.lte = to;
    }
    return where;
  }

  private debtWhere(
    branchId: string | undefined,
    from: Date | undefined,
    to: Date | undefined,
  ): Prisma.PaymentWhereInput {
    // Debt = UNPAID + period elapsed (billingMonthEnd <= to/now).
    const elapsedBy = to ?? new Date();
    const where: Prisma.PaymentWhereInput = {
      status: PaymentStatus.UNPAID,
      billingMonthEnd: { lte: elapsedBy },
    };
    if (branchId) where.branchId = branchId;
    if (from) where.billingMonthStart = { gte: from };
    return where;
  }
}

/** Compute a sortable bucket key (YYYY-MM-DD / YYYY-Www / YYYY-MM) in UTC. */
function bucketKey(date: Date, groupBy: SeriesGroupBy): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  if (groupBy === 'day') {
    return `${y}-${pad(m)}-${pad(date.getUTCDate())}`;
  }
  if (groupBy === 'week') {
    const { isoYear, isoWeek } = isoWeekOf(date);
    return `${isoYear}-W${pad(isoWeek)}`;
  }
  // month (default)
  return `${y}-${pad(m)}`;
}

/** ISO-8601 week number (weeks start Monday) with its ISO year. */
function isoWeekOf(date: Date): { isoYear: number; isoWeek: number } {
  // Copy at UTC midnight.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // ISO day: Mon=1..Sun=7. Shift to the Thursday of this week.
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { isoYear, isoWeek };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Round to 2 decimal places to avoid float artefacts in summed money. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
