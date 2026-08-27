import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AcademyStatus } from '@prisma/client';

/** POST /owner/academies — create a client academy + its founder account. */
export class CreateAcademyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsEmail()
  founderEmail!: string;

  @IsString()
  @MinLength(8)
  founderPassword!: string;

  /** Paid period in months from today. */
  @IsInt()
  @Min(1)
  @Max(60)
  months!: number;

  /** Sale amount recorded into the owner's ledger (optional). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** POST /owner/academies/:id/extend — prolong the subscription. */
export class ExtendAcademyDto {
  @IsInt()
  @Min(1)
  @Max(60)
  months!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** PATCH /owner/academies/:id — contact/name edits. */
export class UpdateAcademyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** PATCH /owner/academies/:id/status — block / unblock. */
export class SetAcademyStatusDto {
  @IsEnum(AcademyStatus)
  status!: AcademyStatus;
}
