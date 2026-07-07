import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

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

  /** Display color (hex). Send null to clear it. */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a #RRGGBB hex value' })
  color?: string | null;
}
