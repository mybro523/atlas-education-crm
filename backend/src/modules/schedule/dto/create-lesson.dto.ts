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
 * when omitted. `roomId`, when set, must reference an existing Room (→ 404).
 * `startsAt`/`endsAt` are the lesson's start & end times. Money fields are TJS.
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

  // Room (kabinet) FK. Optional; must reference an existing Room when provided.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roomId?: string;

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
