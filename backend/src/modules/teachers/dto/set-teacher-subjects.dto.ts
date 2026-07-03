import { ArrayUnique, IsArray, IsString } from 'class-validator';

/**
 * Replace the full set of subjects assigned to a teacher (API contract §5).
 * The service diffs against existing TeacherSubject rows (delete-missing +
 * create-new).
 */
export class SetTeacherSubjectsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  subjectIds!: string[];
}
