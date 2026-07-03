import { IsEnum, IsOptional } from 'class-validator';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query for GET /notifications — optional `channel` / `status` filters on top of
 * the shared pagination (page / pageSize). Enum values are validated against the
 * Prisma enums so a bad value returns 400 instead of silently matching nothing.
 */
export class QueryNotificationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
