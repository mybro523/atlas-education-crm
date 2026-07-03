import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { CreateRemarkDto } from './dto/create-remark.dto';
import { ListRemarksQueryDto } from './dto/list-remarks.query.dto';

/**
 * Journal endpoints: grades, attendance, remarks and the group matrix.
 * Writes are for ADMIN, FOUNDER and TEACHER (own groups only — enforced in the
 * service by resolving the caller's Teacher profile and checking group/lesson
 * ownership).
 */
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.FOUNDER, Role.TEACHER)
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  // Students × lessons matrix for a group.
  @Get('groups/:groupId')
  getGroupMatrix(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
  ) {
    return this.journalService.getGroupMatrix(user, groupId);
  }

  // ---- Grades ----
  @Put('grades')
  upsertGrade(@CurrentUser() user: AuthUser, @Body() dto: UpsertGradeDto) {
    return this.journalService.upsertGrade(user, dto);
  }

  @Delete('grades/:studentId/:lessonId')
  deleteGrade(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.journalService.deleteGrade(user, studentId, lessonId);
  }

  // ---- Attendance ----
  @Put('attendance')
  upsertAttendance(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertAttendanceDto,
  ) {
    return this.journalService.upsertAttendance(user, dto);
  }

  // ---- Remarks ----
  @Post('remarks')
  createRemark(@CurrentUser() user: AuthUser, @Body() dto: CreateRemarkDto) {
    return this.journalService.createRemark(user, dto);
  }

  @Get('remarks')
  listRemarks(
    @CurrentUser() user: AuthUser,
    @Query() query: ListRemarksQueryDto,
  ) {
    return this.journalService.listRemarks(user, query);
  }

  @Delete('remarks/:id')
  deleteRemark(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.journalService.deleteRemark(user, id);
  }
}
