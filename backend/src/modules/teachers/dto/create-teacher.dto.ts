import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CredentialsDto } from '../../../common/dto/credentials.dto';

/**
 * Create a teacher (API contract §5).
 * What a teacher teaches is expressed through the groups they lead (each group
 * carries a course) — there is no longer a subjects assignment.
 */
export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Subject / area the teacher specializes in (e.g. "English", "Math"). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  /** Free-form education level / qualification (e.g. "Bachelor", "Master"). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  educationLevel?: string;

  /**
   * Telegram handle. Accepts an optional leading "@" followed by 5–32
   * characters of letters, digits or underscores (Telegram's own rule).
   */
  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{5,32}$/, {
    message:
      'telegramUsername must be 5–32 letters, digits or underscores, optionally prefixed with "@"',
  })
  telegramUsername?: string;

  /** Teacher's date of birth (ISO 8601 date string). */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  /** Date the teacher started working at the academy (ISO 8601 date string). */
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  /** Hourly pay rate (TJS/hour) — basis for automatic salary computation. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  /** Cabinet login (email + password ≥ 4 chars) issued to the teacher. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;
}
