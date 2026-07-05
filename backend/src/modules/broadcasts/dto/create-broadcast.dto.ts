import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { BroadcastAudience } from '@prisma/client';

/**
 * Body for POST /broadcasts. `audience` selects the recipient set
 * (ALL_STUDENTS | ALL_TEACHERS | BOTH | GROUP). For `GROUP`, `groupId` is
 * required and targets the active students of that group. `text` is the SMS
 * body; `title` is an optional internal label. Bodies are bounded to keep SMS
 * payloads sane.
 */
export class CreateBroadcastDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;

  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  /**
   * Target group — required (and validated for existence in the service) only
   * when `audience` is GROUP; ignored otherwise.
   */
  @ValidateIf((o: CreateBroadcastDto) => o.audience === BroadcastAudience.GROUP)
  @IsString()
  @IsNotEmpty()
  groupId?: string;
}
