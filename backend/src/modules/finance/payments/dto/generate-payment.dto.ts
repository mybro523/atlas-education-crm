import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Generate current-period payment rows from each student's enrollmentDate.
 * Omit `studentId` to run for all active students; `groupId` restricts scope.
 * `ref` is the reference date used to compute the billing period (default now).
 */
export class GeneratePaymentDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  ref?: string;
}
