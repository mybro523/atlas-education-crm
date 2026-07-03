import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for creating a study group (spec §7 / API contract).
 * `courseId`, `subjectId`, `branchId` must reference existing rows (→ 404).
 * `teacherId` is optional; when set it must reference an existing teacher.
 */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
