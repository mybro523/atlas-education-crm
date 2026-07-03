import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query filters for GET /lessons. `from`/`to` bound `startsAt` (inclusive lower,
 * exclusive upper). A TEACHER calling without a `teacherId` filter is scoped to
 * their own lessons in the service.
 */
export class ListLessonsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
