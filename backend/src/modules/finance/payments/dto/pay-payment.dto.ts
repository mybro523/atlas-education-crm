import { IsDateString, IsOptional } from 'class-validator';

/** Mark a payment paid. `paidAt` defaults to now. */
export class PayPaymentDto {
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
