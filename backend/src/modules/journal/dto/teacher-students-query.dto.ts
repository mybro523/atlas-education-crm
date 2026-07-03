import { IsOptional, IsString } from 'class-validator';

/**
 * Filters for GET /me/teacher/students — restrict to one of the teacher's
 * groups and/or free-text search by student first/last name.
 */
export class TeacherStudentsQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
