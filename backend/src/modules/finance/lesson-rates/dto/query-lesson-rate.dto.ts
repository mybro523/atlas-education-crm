import { IsOptional, IsString } from 'class-validator';

/** Filter lesson-rates by group (plain-array list, no pagination). */
export class QueryLessonRateDto {
  @IsOptional()
  @IsString()
  groupId?: string;
}
