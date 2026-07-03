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
 * Partial update for a lesson. All fields optional; validated only when present.
 * (Declared explicitly to avoid a dependency on @nestjs/mapped-types.)
 */
export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  groupId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  teacherPayRate?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lessonRateId?: string;

  @IsOptional()
  @IsBoolean()
  isConducted?: boolean;
}
