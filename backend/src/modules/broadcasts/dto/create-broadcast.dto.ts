import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { BroadcastAudience } from '@prisma/client';

/**
 * Body for POST /broadcasts. `audience` selects the recipient set
 * (ALL_STUDENTS | ALL_TEACHERS | BOTH). `text` is the SMS body; `title` is an
 * optional internal label. Bodies are bounded to keep SMS payloads sane.
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
}
