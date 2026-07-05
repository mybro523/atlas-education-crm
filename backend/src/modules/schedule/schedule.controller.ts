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
import { ScheduleService } from './schedule.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ConductLessonDto } from './dto/conduct-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons.query.dto';

/**
 * Schedule / lessons. Reading is open to any authenticated role (a TEACHER
 * caller is scoped to their own lessons in the service). Lesson CRUD is
 * ADMIN + FOUNDER; a TEACHER may PATCH / mark-conducted their OWN lessons
 * (ownership enforced in the service).
 *
 * Mounted at `/api/lessons` per the API contract (§8).
 */
@UseGuards(RolesGuard)
@Controller('lessons')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ---- Read ---------------------------------------------------------------

  @Get()
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  findAll(
    @Query() query: ListLessonsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduleService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.scheduleService.findOne(id, user);
  }

  // ---- Write --------------------------------------------------------------

  @Post()
  @Roles(Role.FOUNDER, Role.ADMIN)
  create(@Body() dto: CreateLessonDto) {
    return this.scheduleService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduleService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.FOUNDER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  @Patch(':id/conduct')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.TEACHER)
  conduct(
    @Param('id') id: string,
    @Body() dto: ConductLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduleService.conduct(id, dto.isConducted, user);
  }
}
