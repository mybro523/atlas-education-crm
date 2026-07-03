import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Partial update of a parent (API contract §6, `UpdateParentDto = Partial`).
 * Written explicitly (no `@nestjs/mapped-types` dependency).
 */
export class UpdateParentDto {
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
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsString()
  workplace?: string;
}
