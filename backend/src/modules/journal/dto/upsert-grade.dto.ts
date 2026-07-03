import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Upsert a grade for a (student, lesson) pair.
 * Unique on Grade.@@unique([studentId, lessonId]) — 5-point scale, values 2..5.
 */
export class UpsertGradeDto {
  @IsString()
  studentId!: string;

  @IsString()
  lessonId!: string;

  @IsInt()
  @Min(2)
  @Max(5)
  value!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
