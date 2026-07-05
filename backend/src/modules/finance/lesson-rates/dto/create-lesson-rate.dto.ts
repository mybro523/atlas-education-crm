import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Create a flexible pay rate (TJS) used as the fallback per-lesson teacher pay.
 * `groupId` scopes the rate to a group; omit for a "global" rate.
 */
export class CreateLessonRateDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount!: number;
}
