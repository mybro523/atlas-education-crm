import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Partial update body for a Branch (§1). All fields optional; when `name` is
 * provided it must be a non-empty string. (Written without `PartialType` to
 * avoid a dependency on `@nestjs/mapped-types`, which is not installed.)
 */
export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
