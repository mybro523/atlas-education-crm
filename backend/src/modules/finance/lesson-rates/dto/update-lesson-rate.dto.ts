import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Partial update of a lesson-rate. All fields optional; same per-field
 * validation as create. (Defined explicitly rather than via `PartialType`
 * to avoid an extra runtime dependency.)
 */
export class UpdateLessonRateDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount?: number;
}
