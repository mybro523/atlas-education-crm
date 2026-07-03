/** Analytics (API_CONTRACT §15, FOUNDER only). Read-only. */

export type AnalyticsGroupBy = 'day' | 'week' | 'month';
export type AnalyticsMetric = 'income' | 'expense' | 'debt' | 'net';

export interface AnalyticsSummaryParams {
  from?: string;
  to?: string;
  branchId?: string;
}

export interface AnalyticsSeriesParams extends AnalyticsSummaryParams {
  groupBy?: AnalyticsGroupBy;
  metric?: AnalyticsMetric;
}

export interface BranchTotals {
  branchId: string;
  branchName: string;
  income: number;
  expense: number;
  net: number;
  debt: number;
}

export interface AnalyticsSummary {
  range: { from: string | null; to: string | null };
  combined: { income: number; expense: number; net: number; debt: number };
  byBranch: BranchTotals[];
}

export interface SeriesPoint {
  bucket: string;
  value: number;
}

export interface AnalyticsSeries {
  metric: AnalyticsMetric;
  groupBy: AnalyticsGroupBy;
  combined: SeriesPoint[];
  byBranch: Array<{
    branchId: string;
    branchName: string;
    points: SeriesPoint[];
  }>;
}
