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
import { TeachersService } from './teachers.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';

/**
 * Teachers (API contract §5).
 * Reads: any authenticated staff (global JwtAuthGuard). Writes: ADMIN + FOUNDER.
 * RolesGuard is NOT global, so it is applied per-handler on write routes.
 */
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  // ---- Reads (any authenticated user) ----------------------------------

  @Get()
  findAll(@Query() query: QueryTeachersDto) {
    return this.teachersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  // ---- Writes (ADMIN + FOUNDER) ----------------------------------------

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FOUNDER)
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FOUNDER)
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FOUNDER)
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
