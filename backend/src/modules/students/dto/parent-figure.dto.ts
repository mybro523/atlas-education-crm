import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * An explicit father/mother slot on the student create/update form (rework).
 * The `ParentRelation` (FATHER / MOTHER) is implied by which slot the object is
 * sent in, so it is not part of this DTO. `position` (должность) and `workplace`
 * both participate in student search.
 *
 * The whole slot is optional; when present it must carry the identifying fields
 * required by the `Parent` model.
 */
export class ParentFigureDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  workplace?: string;

  @IsOptional()
  @IsString()
  position?: string;
}
