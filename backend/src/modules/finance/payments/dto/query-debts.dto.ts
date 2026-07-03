import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Filters for the debts report (unpaid, elapsed billing periods). */
export class QueryDebtsDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  /** "As of" instant — a period counts as debt if it has fully elapsed. */
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
