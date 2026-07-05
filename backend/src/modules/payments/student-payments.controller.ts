import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { StudentPaymentsService } from './student-payments.service';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { QueryStudentPaymentDto } from './dto/query-student-payment.dto';
import { QueryUpcomingDto } from './dto/query-upcoming.dto';

// FOUNDER + ADMIN. Route: /api/student-payments
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER, Role.ADMIN)
@Controller('student-payments')
export class StudentPaymentsController {
  constructor(private readonly service: StudentPaymentsService) {}

  @Get()
  findAll(@Query() query: QueryStudentPaymentDto) {
    return this.service.findAll(query);
  }

  /** Students whose subscription ends within N days (default 3) or already ended. */
  @Get('upcoming')
  findUpcoming(@Query() query: QueryUpcomingDto) {
    return this.service.findUpcoming(query);
  }

  @Post()
  create(@Body() dto: CreateStudentPaymentDto) {
    return this.service.create(dto);
  }
}
