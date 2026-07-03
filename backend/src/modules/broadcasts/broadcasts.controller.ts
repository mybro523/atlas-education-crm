import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { QueryBroadcastsDto } from './dto/query-broadcasts.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// SMS broadcasts (courses / birthdays / announcements) — FOUNDER + ADMIN only.
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER, Role.ADMIN)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  /** Paginated broadcast history. */
  @Get()
  findAll(@Query() query: QueryBroadcastsDto) {
    return this.broadcastsService.findAll(query);
  }

  /** Create + enqueue a broadcast; returns the persisted (QUEUED) record. */
  @Post()
  create(
    @Body() dto: CreateBroadcastDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.broadcastsService.create(dto, userId);
  }

  /** Broadcast detail / status. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.broadcastsService.findOne(id);
  }
}
