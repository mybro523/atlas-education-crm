import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for creating a Branch (§1 of the API contract).
 * `name` is required; `address` and `phone` are optional tags.
 */
export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
