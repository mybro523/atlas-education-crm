import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Create a teacher (API contract §5).
 * What a teacher teaches is expressed through the groups they lead (each group
 * carries a course) — there is no longer a subjects assignment.
 */
export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
