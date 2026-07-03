import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

/** Shared filters for the analytics summary. */
export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** Restrict analytics to a single branch. */
  @IsOptional()
  @IsString()
  branchId?: string;
}

export type SeriesGroupBy = 'day' | 'week' | 'month';
export type SeriesMetric = 'income' | 'expense' | 'debt' | 'net';

/** Filters for the time-series endpoint (extends summary filters). */
export class AnalyticsSeriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: SeriesGroupBy;

  @IsOptional()
  @IsIn(['income', 'expense', 'debt', 'net'])
  metric?: SeriesMetric;
}
