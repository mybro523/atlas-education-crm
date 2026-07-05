import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * List/search filters for students (API contract §6).
 * `search` matches student firstName OR lastName OR any parent workplace OR any
 * parent position/должность (case-insensitive `contains`) — hard requirement
 * from spec §4.4.
 */
export class QueryStudentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
