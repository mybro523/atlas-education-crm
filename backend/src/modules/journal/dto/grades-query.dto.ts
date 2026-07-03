import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Filters for GET /me/student/grades — optional subject filter and date range
 * (applied to the parent lesson's startsAt).
 */
export class GradesQueryDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
