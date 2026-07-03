import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Partial update for a group. Every field is optional; when present it is
 * validated with the same rules as CreateGroupDto. (Declared explicitly rather
 * than via PartialType to avoid a dependency on @nestjs/mapped-types.)
 */
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  courseId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
