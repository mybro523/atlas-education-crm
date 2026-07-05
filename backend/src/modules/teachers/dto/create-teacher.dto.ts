import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  userId?: string;
}
