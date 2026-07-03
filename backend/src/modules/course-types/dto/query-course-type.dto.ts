import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Query for listing CourseTypes (§3): optional `?active` boolean filter on
 * `isActive`. Query params arrive as strings, so `active` is coerced from
 * "true"/"false" (and 1/0) to a real boolean.
 */
export class QueryCourseTypeDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
