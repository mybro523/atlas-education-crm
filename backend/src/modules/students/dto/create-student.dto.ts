import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentDto)
  parents?: CreateParentDto[];
}
