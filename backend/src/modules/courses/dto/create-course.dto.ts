import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Body for creating a Course (§4). The two foreign keys (courseType, branch)
 * must reference existing rows — the service throws 404 otherwise.
 * `pricePerMonth` is the monthly tuition in TJS (stored as Decimal).
 * `startDate` / `endDate` are the optional term dates (ISO 8601) — the course
 * runs e.g. 2026-07-01..2026-08-01.
 */
export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  courseTypeId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerMonth!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
