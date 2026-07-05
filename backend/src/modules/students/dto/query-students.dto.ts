import { IsIn, IsOptional, IsString } from 'class-validator';
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
  courseId?: string;

  /**
   * Subscription-debt filter: 'with' → only debtors (owedAmount > 0),
   * 'without' → only fully-paid students. Computed post-query because the owed
   * figure derives from courseFee/course price minus PAID payments.
   */
  @IsOptional()
  @IsIn(['with', 'without'])
  debt?: 'with' | 'without';

  @IsOptional()
  @IsString()
  search?: string;
}
