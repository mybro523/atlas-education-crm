import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Subject } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * `/api/subjects` (§2). Reads open to any authenticated user; writes limited to
 * ADMIN + FOUNDER. RolesGuard is added because it is not globally registered.
 */
@UseGuards(RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll(): Promise<Subject[]> {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Subject> {
    return this.subjectsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Post()
  create(@Body() dto: CreateSubjectDto): Promise<Subject> {
    return this.subjectsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<Subject> {
    return this.subjectsService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<Subject> {
    return this.subjectsService.remove(id);
  }
}
