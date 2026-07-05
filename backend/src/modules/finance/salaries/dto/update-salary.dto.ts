import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { SalaryStatus } from '@prisma/client';

/** Update a salary's amount / status / paidAt. */
export class UpdateSalaryDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount?: number;

  @IsOptional()
  @IsEnum(SalaryStatus)
  status?: SalaryStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
