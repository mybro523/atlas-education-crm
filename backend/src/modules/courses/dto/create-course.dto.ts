import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Body for creating a Course (§4). The three foreign keys (courseType, subject,
 * branch) must reference existing rows — the service throws 404 otherwise.
 * `pricePerMonth` is the monthly tuition in TJS (stored as Decimal).
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
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerMonth!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
