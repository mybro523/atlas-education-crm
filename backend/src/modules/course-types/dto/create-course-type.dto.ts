import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for creating a CourseType (§3). `name` is unique → 409 on duplicate.
 * `isActive` defaults to true at the DB level when omitted.
 */
export class CreateCourseTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
