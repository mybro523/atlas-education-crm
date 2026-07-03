import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StudentSelfService } from './student-self.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GradesQueryDto } from '../dto/grades-query.dto';
import { ScheduleQueryDto } from '../dto/schedule-query.dto';

/**
 * Student self-service endpoints. STUDENT only; every method operates on the
 * caller's own Student profile (resolved from userId in the service).
 */
@UseGuards(RolesGuard)
@Roles(Role.STUDENT)
@Controller('me/student')
export class StudentSelfController {
  constructor(private readonly studentSelf: StudentSelfService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.studentSelf.getProfile(userId);
  }

  @Get('grades')
  getGrades(
    @CurrentUser('id') userId: string,
    @Query() query: GradesQueryDto,
  ) {
    return this.studentSelf.getGrades(userId, query);
  }

  @Get('schedule')
  getSchedule(
    @CurrentUser('id') userId: string,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.studentSelf.getSchedule(userId, query);
  }

  @Get('performance')
  getPerformance(@CurrentUser('id') userId: string) {
    return this.studentSelf.getPerformance(userId);
  }
}
