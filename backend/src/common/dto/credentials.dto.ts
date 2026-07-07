import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Login credentials issued to a student/teacher so they can access their
 * personal cabinet. Sent nested inside the create/update DTOs.
 */
export class CredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
