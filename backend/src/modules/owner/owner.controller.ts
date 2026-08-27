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
import { OwnerService } from './owner.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import {
  CreateAcademyDto,
  ExtendAcademyDto,
  SetAcademyStatusDto,
  UpdateAcademyDto,
} from './dto/owner.dto';

/** Platform-owner panel API. OWNER only — no academy role can reach it. */
@UseGuards(RolesGuard)
@Roles(Role.OWNER)
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('academies')
  list() {
    return this.ownerService.list();
  }

  @Post('academies')
  create(@Body() dto: CreateAcademyDto) {
    return this.ownerService.create(dto);
  }

  @Post('academies/:id/extend')
  extend(@Param('id') id: string, @Body() dto: ExtendAcademyDto) {
    return this.ownerService.extend(id, dto);
  }

  @Patch('academies/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetAcademyStatusDto) {
    return this.ownerService.setStatus(id, dto);
  }

  @Patch('academies/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAcademyDto) {
    return this.ownerService.update(id, dto);
  }

  @Delete('academies/:id')
  remove(@Param('id') id: string) {
    return this.ownerService.remove(id);
  }

  @Get('payments')
  payments(@Query('academyId') academyId?: string) {
    return this.ownerService.payments(academyId || undefined);
  }
}
