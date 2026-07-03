import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Partial update body for a Course (§4). Any provided FK is re-validated. */
export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  courseTypeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerMonth?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
