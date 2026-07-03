import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  AnalyticsSeriesQueryDto,
} from './dto/analytics-query.dto';

// FOUNDER-only. Route: /api/finance/analytics
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER)
@Controller('finance/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('summary')
  summary(@Query() query: AnalyticsQueryDto) {
    return this.service.summary(query);
  }

  @Get('series')
  series(@Query() query: AnalyticsSeriesQueryDto) {
    return this.service.series(query);
  }
}
