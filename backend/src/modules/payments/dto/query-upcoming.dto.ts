import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query for the "subscription ending soon" panel. */
export class QueryUpcomingDto {
  /** Look-ahead window in days (default 3). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  days?: number;
}
