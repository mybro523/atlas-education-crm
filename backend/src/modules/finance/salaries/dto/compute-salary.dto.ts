import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Compute a teacher's per-lesson salary for [from, to]. When `persist` is true
 * a PER_LESSON / PENDING Salary row is also created.
 */
export class ComputeSalaryDto {
  @IsString()
  teacherId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}
