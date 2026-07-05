import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query filters for GET /lessons. `from`/`to` bound `startsAt` (inclusive lower,
 * exclusive upper) — used for the month/calendar view. `courseId` filters via the
 * lesson's group→course; `roomId` filters by assigned room. A TEACHER calling
 * without a `teacherId` filter is scoped to their own lessons in the service.
 */
export class ListLessonsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
