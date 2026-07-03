import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SalaryStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

/** List filters for salaries (paginated). */
export class QuerySalaryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(SalaryStatus)
  status?: SalaryStatus;

  /** Filter on `periodStart` >= from. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filter on `periodEnd` <= to. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
