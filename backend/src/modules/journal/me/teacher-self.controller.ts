import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TeacherSelfService } from './teacher-self.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ScheduleQueryDto } from '../dto/schedule-query.dto';
import { TeacherStudentsQueryDto } from '../dto/teacher-students-query.dto';

/**
 * Teacher self-service endpoints. TEACHER only; every method operates on the
 * caller's own Teacher profile (resolved from userId in the service).
 */
@UseGuards(RolesGuard)
@Roles(Role.TEACHER)
@Controller('me/teacher')
export class TeacherSelfController {
  constructor(private readonly teacherSelf: TeacherSelfService) {}

  @Get('groups')
  getGroups(@CurrentUser('id') userId: string) {
    return this.teacherSelf.getGroups(userId);
  }

  @Get('students')
  getStudents(
    @CurrentUser('id') userId: string,
    @Query() query: TeacherStudentsQueryDto,
  ) {
    return this.teacherSelf.getStudents(userId, query);
  }

  @Get('schedule')
  getSchedule(
    @CurrentUser('id') userId: string,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.teacherSelf.getSchedule(userId, query);
  }
}
