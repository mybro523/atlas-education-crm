import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Partial update body for a Room. Passing `branchId: null` detaches the room
 * from its branch; a non-empty `branchId` must reference an existing branch.
 */
export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
