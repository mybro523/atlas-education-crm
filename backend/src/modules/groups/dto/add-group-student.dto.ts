import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for POST /groups/:id/students — enrol a student into the group.
 */
export class AddGroupStudentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;
}
