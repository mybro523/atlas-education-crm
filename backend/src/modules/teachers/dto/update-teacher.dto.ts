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
 * Update a teacher (API contract §5). All fields optional.
 *
 * Written as an explicit class (rather than `PartialType`) so the module has no
 * dependency on `@nestjs/mapped-types`.
 */
export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

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
   * Send an empty string to clear it.
   */
  @IsOptional()
  @IsString()
  @Matches(/^(@?[A-Za-z0-9_]{5,32})?$/, {
    message:
      'telegramUsername must be 5–32 letters, digits or underscores, optionally prefixed with "@"',
  })
  telegramUsername?: string;

  /** Teacher's date of birth (ISO 8601 date string). Send null to clear it. */
  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  /**
   * Date the teacher started working at the academy (ISO 8601 date string).
   * Send null to clear it.
   */
  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  @IsOptional()
  @IsString()
  branchId?: string;

  /** Hourly pay rate (TJS/hour). Send null to clear it. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  hourlyRate?: number | null;

  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Issue (or re-issue) cabinet credentials: creates the linked User when the
   * teacher has none, otherwise updates the login email + password.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;
}
