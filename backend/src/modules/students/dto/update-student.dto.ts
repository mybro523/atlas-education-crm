import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReferralSource, StudentLevel } from '@prisma/client';
import { ParentFigureDto } from './parent-figure.dto';

/**
 * Partial update of a student (API contract §6).
 *
 * The explicit `father` / `mother` slots may be sent from the student form: each
 * upserts the single FATHER / MOTHER parent for this student. Other (OTHER)
 * parents are still managed via the dedicated parent sub-routes.
 *
 * Written explicitly (no `@nestjs/mapped-types` dependency).
 */
export class UpdateStudentDto {
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
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  /**
   * Course the student is enrolled in — must reference an existing Course.
   * Send an empty string / null to un-link the current course.
   */
  @IsOptional()
  @IsString()
  courseId?: string | null;

  /** Learning level (beginner / standard / advanced). */
  @IsOptional()
  @IsEnum(StudentLevel)
  level?: StudentLevel | null;

  /** How the student found the academy. */
  @IsOptional()
  @IsEnum(ReferralSource)
  referralSource?: ReferralSource | null;

  /** The sum the student must pay for the course (TJS, stored as Decimal). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  courseFee?: number | null;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParentFigureDto)
  father?: ParentFigureDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParentFigureDto)
  mother?: ParentFigureDto;
}
