import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { AbsenceCheckService } from '../automation/absence-check.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

// Notification history + manual triggers — FOUNDER + ADMIN only.
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER, Role.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => AbsenceCheckService))
    private readonly absenceCheck: AbsenceCheckService,
  ) {}

  /** Paginated notification history (TELEGRAM / SMS), newest first. */
  @Get()
  findAll(@Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAll(query);
  }

  /**
   * Manually run the 3-consecutive-absences scan (for testing the daily cron).
   * Returns a summary of the run.
   */
  @Post('run-absence-check')
  @HttpCode(HttpStatus.OK)
  runAbsenceCheck() {
    return this.absenceCheck.scan();
  }
}
