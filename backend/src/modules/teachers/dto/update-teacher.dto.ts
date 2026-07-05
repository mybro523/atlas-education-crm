import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Update a teacher (API contract §5). All fields optional.
 *
 * Written as an explicit class (rather than `PartialType`) so the module has no
 * dependency on `@nestjs/mapped-types`.
 */
export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
