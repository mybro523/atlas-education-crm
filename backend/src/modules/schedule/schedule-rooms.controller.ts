import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RoomOccupancyQueryDto } from './dto/room-occupancy.query.dto';

/**
 * Room-occupancy view for the schedule UI. Mounted at `/api/schedule` so the
 * occupancy probe lives under the schedule namespace (distinct from the
 * `/api/lessons` CRUD controller). Read-only; open to any authenticated staff.
 */
@UseGuards(RolesGuard)
@Controller('schedule')
export class ScheduleRoomsController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('rooms/occupancy')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  roomOccupancy(@Query() query: RoomOccupancyQueryDto) {
    return this.scheduleService.roomOccupancy(query);
  }
}
