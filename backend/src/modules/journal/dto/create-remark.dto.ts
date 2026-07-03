import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Create a remark about a student, optionally tied to a specific lesson.
 * `authorId` is taken from the current user in the service (never from the body).
 */
export class CreateRemarkDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}
