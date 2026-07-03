import { IsOptional, IsString } from 'class-validator';

/**
 * Filters for GET /journal/remarks. All optional; a TEACHER caller is
 * additionally scoped to remarks on their own groups' lessons/students.
 */
export class ListRemarksQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
