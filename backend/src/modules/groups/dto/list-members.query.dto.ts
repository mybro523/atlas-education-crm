import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query for GET /groups/:id/students. By default only active members
 * (`leftAt = null`) are returned; `?includeLeft=true` also returns past ones.
 */
export class ListMembersQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeLeft?: boolean;
}
