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
 * Body for POST /lessons — schedule a concrete lesson for a group.
 * `groupId` must exist (→ 404). `teacherId` defaults to the group's teacher
 * when omitted. Money fields are TJS decimals.
 */
export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  room?: string;

  // Per-lesson pay-rate override for the teacher (TJS). Falls back to lessonRate.
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
