import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  BlockUserDto,
  CreateEmployeeDto,
  ResetPasswordDto,
} from './dto/create-employee.dto';

// Staff/user management. Reads: FOUNDER + ADMIN; mutations: FOUNDER only.
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER, Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Staff accounts (non-students) with profile names — the Employees screen. */
  @Get('staff')
  findStaff() {
    return this.usersService.findStaff();
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** Create a staff account (login + password). FOUNDER only. */
  @Post()
  @Roles(Role.FOUNDER)
  create(@Body() dto: CreateEmployeeDto) {
    return this.usersService.createEmployee(dto);
  }

  /** Reset a user's password. FOUNDER only. */
  @Patch(':id/password')
  @Roles(Role.FOUNDER)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.password);
  }

  /** Block / unblock an account. FOUNDER only. */
  @Patch(':id/block')
  @Roles(Role.FOUNDER)
  setBlocked(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.usersService.setBlocked(id, Boolean(dto.blocked), caller.id);
  }

  /** Delete a staff account. FOUNDER only. */
  @Delete(':id')
  @Roles(Role.FOUNDER)
  remove(@Param('id') id: string, @CurrentUser() caller: AuthUser) {
    return this.usersService.remove(id, caller.id);
  }
}
