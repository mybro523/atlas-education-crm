import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// System settings: any signed-in staff can read; only the FOUNDER can change.
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(Role.FOUNDER)
  update(@Body() dto: UpdateSettingsDto) {
    return this.service.updateMany(dto.entries);
  }
}
