import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Room } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * `/api/rooms` — flexible room/kabinet dictionary. Reads open to any
 * authenticated user; writes limited to ADMIN + FOUNDER. RolesGuard added
 * because it is not globally registered.
 */
@UseGuards(RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll(@Query() query: QueryRoomDto): Promise<Room[]> {
    return this.roomsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Room> {
    return this.roomsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Post()
  create(@Body() dto: CreateRoomDto): Promise<Room> {
    return this.roomsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto): Promise<Room> {
    return this.roomsService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<Room> {
    return this.roomsService.remove(id);
  }
}
