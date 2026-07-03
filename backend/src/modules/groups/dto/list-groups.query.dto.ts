import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query filters for GET /groups. Extends the shared pagination DTO.
 * `branchId` is a soft tag filter (all staff may read every branch).
 * `search` matches the group `name` (case-insensitive, contains).
 */
export class ListGroupsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  // Query params arrive as strings; coerce "true"/"false" into booleans.
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
