import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Filters for GET /me/student/grades — optional course filter and date range
 * (applied to the parent lesson's startsAt).
 */
export class GradesQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
