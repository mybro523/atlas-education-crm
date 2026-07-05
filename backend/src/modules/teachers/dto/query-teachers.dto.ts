import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * List/search filters for teachers (API contract §5).
 * `search` matches firstName OR lastName (case-insensitive).
 */
export class QueryTeachersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
