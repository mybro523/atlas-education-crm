import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** List filters for the student subscription payments history (paginated). */
export class QueryStudentPaymentDto extends PaginationQueryDto {
  /** Free-text match on the student's first OR last name (case-insensitive). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  /** Filter on `paidAt` >= from. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filter on `paidAt` <= to. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
