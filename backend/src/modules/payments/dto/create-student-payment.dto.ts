import { IsEnum, IsNumber, IsString, Max, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/**
 * Body for recording an ad-hoc student subscription payment.
 *
 * The payment is recorded as PAID immediately. `amount` is money with at most
 * 2 decimal places, strictly positive and capped at the DB Decimal(10,2) range.
 */
export class CreateStudentPaymentDto {
  @IsString()
  studentId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
