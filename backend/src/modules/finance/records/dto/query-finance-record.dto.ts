import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { FinanceType } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

/** List filters for finance records (paginated). */
export class QueryFinanceRecordDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FinanceType)
  type?: FinanceType;

  @IsOptional()
  @IsString()
  branchId?: string;

  /** Filter on `occurredAt` >= from. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filter on `occurredAt` <= to. */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Free-text match on category OR description (case-insensitive). */
  @IsOptional()
  @IsString()
  search?: string;
}
