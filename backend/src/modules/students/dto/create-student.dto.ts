import { Type } from 'class-transformer';
import {
  IsArray,
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
import { CredentialsDto } from '../../../common/dto/credentials.dto';
import { CreateParentDto } from './create-parent.dto';
import { ParentFigureDto } from './parent-figure.dto';

/**
 * Create a student (API contract §6), optionally with parents.
 * `enrollmentDate` anchors the monthly billing period (spec §0.5); it defaults
 * to now when omitted.
 *
 * Parents can be supplied in two ways (they are merged): the explicit `father`
 * and `mother` slots (persisted with the FATHER / MOTHER relation), and/or the
 * generic `parents[]` array (each carrying its own relation, default OTHER).
 */
export class CreateStudentDto {
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
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  /** Course the student is enrolled in — must reference an existing Course. */
  @IsOptional()
  @IsString()
  courseId?: string;

  /** Learning level (beginner / standard / advanced). */
  @IsOptional()
  @IsEnum(StudentLevel)
  level?: StudentLevel;

  /** How the student found the academy. */
  @IsOptional()
  @IsEnum(ReferralSource)
  referralSource?: ReferralSource;

  /** The sum the student must pay for the course (TJS, stored as Decimal). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  courseFee?: number;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  /** Free-form remark/note about the student — searchable. */
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  /** Cabinet login (email + password ≥ 4 chars) issued to the student. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentDto)
  parents?: CreateParentDto[];
}
