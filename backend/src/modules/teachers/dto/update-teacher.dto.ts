import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  userId?: string;
}
