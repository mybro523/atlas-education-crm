import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

/** List filters for payments (paginated). */
export class QueryPaymentDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  /** Filter on `billingMonthStart` >= from. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filter on `billingMonthStart` <= to. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
