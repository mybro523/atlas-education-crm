import { IsDateString, IsOptional } from 'class-validator';

/**
 * Date-range filter (on Lesson.startsAt) for the self schedule endpoints.
 */
export class ScheduleQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
