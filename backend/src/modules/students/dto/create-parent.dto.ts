import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * A student's parent/guardian (API contract §6). `workplace` participates in
 * student search (spec §4.4).
 */
export class CreateParentDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  workplace?: string;
}
