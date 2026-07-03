import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST /chats/conversations/:id/messages — the outbound reply text.
 * Meta caps message bodies well above this, but we bound it to keep payloads
 * sane and avoid provider rejections.
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;
}
