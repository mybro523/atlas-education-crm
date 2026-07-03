import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Partial update body for a CourseType (§3). */
export class UpdateCourseTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
