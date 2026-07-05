import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FinanceType } from '@prisma/client';

/** Create an income or expense ledger record (TJS). */
export class CreateFinanceRecordDto {
  @IsString()
  branchId!: string;

  @IsEnum(FinanceType)
  type!: FinanceType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
