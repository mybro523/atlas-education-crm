import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SalaryBasis, SalaryStatus } from '@prisma/client';

/**
 * Persist a salary row. Exactly one of `teacherId` / `employeeId` must be set
 * (validated in the service → 400 otherwise).
 */
export class CreateSalaryDto {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsEnum(SalaryBasis)
  basis!: SalaryBasis;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsEnum(SalaryStatus)
  status?: SalaryStatus;
}
