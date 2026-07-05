import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for creating a study group (spec §7 / API contract).
 * `courseId` and `branchId` must reference existing rows (→ 404).
 * `teacherId` is optional; when set it must reference an existing teacher.
 */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

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
