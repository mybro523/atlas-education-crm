import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Query for GET /schedule/rooms/occupancy — resolves which rooms are free vs.
 * occupied over a time window so the UI can render a room picker.
 *
 * Provide the window either as `date` (a single day → the whole calendar day)
 * or as an explicit `from`/`to` range. If both are given, `from`/`to` win.
 * `branchId` optionally scopes the returned rooms to one branch.
 */
export class RoomOccupancyQueryDto {
  // Single-day shorthand: expands to [date 00:00, next-day 00:00).
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
