import { ParentRelation } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * A student's parent/guardian (API contract §6). Both `workplace` and `position`
 * (должность) participate in student search (spec §4.4). `relation` marks the
 * parent as FATHER / MOTHER / OTHER (defaults to OTHER when omitted).
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
  @IsEnum(ParentRelation)
  relation?: ParentRelation;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  workplace?: string;
}
