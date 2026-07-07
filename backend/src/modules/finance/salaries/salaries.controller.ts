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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { SalariesService } from './salaries.service';
import { ComputeSalaryDto } from './dto/compute-salary.dto';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { QuerySalaryDto } from './dto/query-salary.dto';

// FOUNDER-only. Route: /api/finance/salaries
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER)
@Controller('finance/salaries')
export class SalariesController {
  constructor(private readonly service: SalariesService) {}

  @Get()
  findAll(@Query() query: QuerySalaryDto) {
    return this.service.findAll(query);
  }

  // Static routes before ':id'.

  /** Automatic per-period salary overview for ALL staff (teachers + admin). */
  @Get('overview')
  overview(@Query('from') from: string, @Query('to') to: string) {
    return this.service.overview(from, to);
  }

  @Post('compute')
  compute(@Body() dto: ComputeSalaryDto) {
    return this.service.compute(dto);
  }

  @Post()
  create(@Body() dto: CreateSalaryDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/pay')
  pay(@Param('id') id: string) {
    return this.service.pay(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalaryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
