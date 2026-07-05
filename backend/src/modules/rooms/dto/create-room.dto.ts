import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for creating a Room / kabinet. `name` is free text (no uniqueness).
 * `branchId` is optional — when provided it must reference an existing branch
 * (→ 404 otherwise); the relation is SetNull, so a room may be branch-less.
 * `isActive` defaults to true at the DB level when omitted.
 */
export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
