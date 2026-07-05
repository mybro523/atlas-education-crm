import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
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
