import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
  amount!: number;
}
