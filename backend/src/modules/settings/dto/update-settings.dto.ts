import { IsObject } from 'class-validator';

/** PUT /settings body: a partial map of known setting keys to string values. */
export class UpdateSettingsDto {
  @IsObject()
  entries!: Record<string, string>;
}
