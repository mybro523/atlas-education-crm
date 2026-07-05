import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Query for listing Rooms: optional `?branchId` filter and an optional
 * `?active` boolean filter on `isActive` (plain array response, no pagination —
 * this is a dictionary endpoint). Query params arrive as strings, so `active`
 * is coerced from "true"/"false" (and 1/0) to a real boolean.
 */
export class QueryRoomDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
