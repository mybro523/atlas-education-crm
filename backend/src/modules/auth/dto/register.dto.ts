import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

/**
 * Public self-registration. Note there is deliberately NO `role` or `branchId`
 * field: with the global ValidationPipe running `forbidNonWhitelisted: true`,
 * any client-sent role/branch is rejected outright, and the service forces
 * Role.STUDENT. Privileged accounts are created only via POST /users.
 */
export class RegisterDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(5)
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
