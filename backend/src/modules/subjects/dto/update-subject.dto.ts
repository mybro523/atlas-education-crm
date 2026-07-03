import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Partial update body for a Subject (§2). */
export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
