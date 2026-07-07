import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

/** Staff roles the founder can hand out from the Employees screen. */
export const EMPLOYEE_ROLES = [
  Role.ADMIN,
  Role.SALES_MANAGER,
  Role.TEACHER,
] as const;

/**
 * Create a staff account (login + password) from the Employees screen.
 * TEACHER accounts also get a Teacher profile; other staff get an Employee one.
 */
export class CreateEmployeeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsEnum(Role)
  @IsIn(EMPLOYEE_ROLES as readonly Role[])
  role!: Role;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(4)
  password!: string;
}

export class BlockUserDto {
  // @IsBoolean is REQUIRED: the global ValidationPipe runs with whitelist:true,
  // which strips undecorated properties — without it `blocked` always arrived
  // as undefined and blocking silently never engaged.
  @IsBoolean()
  blocked!: boolean;
}
