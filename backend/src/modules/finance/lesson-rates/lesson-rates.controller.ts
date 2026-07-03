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
import { LessonRatesService } from './lesson-rates.service';
import { CreateLessonRateDto } from './dto/create-lesson-rate.dto';
import { UpdateLessonRateDto } from './dto/update-lesson-rate.dto';
import { QueryLessonRateDto } from './dto/query-lesson-rate.dto';

// FOUNDER-only. Route: /api/finance/lesson-rates
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER)
@Controller('finance/lesson-rates')
export class LessonRatesController {
  constructor(private readonly service: LessonRatesService) {}

  @Get()
  findAll(@Query() query: QueryLessonRateDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLessonRateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
