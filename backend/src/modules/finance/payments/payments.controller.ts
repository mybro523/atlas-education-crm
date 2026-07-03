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
import { PaymentsService } from './payments.service';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { GeneratePaymentDto } from './dto/generate-payment.dto';
import { PayPaymentDto } from './dto/pay-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryDebtsDto } from './dto/query-debts.dto';

// FOUNDER-only. Route: /api/payments
@UseGuards(RolesGuard)
@Roles(Role.FOUNDER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  findAll(@Query() query: QueryPaymentDto) {
    return this.service.findAll(query);
  }

  // Declared before ':id' so "debts" is not captured as an id param.
  @Get('debts')
  findDebts(@Query() query: QueryDebtsDto) {
    return this.service.findDebts(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('generate')
  generate(@Body() dto: GeneratePaymentDto) {
    return this.service.generate(dto);
  }

  @Patch(':id/pay')
  pay(@Param('id') id: string, @Body() dto: PayPaymentDto) {
    return this.service.pay(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
