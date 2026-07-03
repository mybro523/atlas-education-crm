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
import { CourseType } from '@prisma/client';
import { CourseTypesService } from './course-types.service';
import { CreateCourseTypeDto } from './dto/create-course-type.dto';
import { UpdateCourseTypeDto } from './dto/update-course-type.dto';
import { QueryCourseTypeDto } from './dto/query-course-type.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * `/api/course-types` (§3). Reads open to any authenticated user; writes limited
 * to ADMIN + FOUNDER. RolesGuard added because it is not globally registered.
 */
@UseGuards(RolesGuard)
@Controller('course-types')
export class CourseTypesController {
  constructor(private readonly courseTypesService: CourseTypesService) {}

  @Get()
  findAll(@Query() query: QueryCourseTypeDto): Promise<CourseType[]> {
    return this.courseTypesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CourseType> {
    return this.courseTypesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Post()
  create(@Body() dto: CreateCourseTypeDto): Promise<CourseType> {
    return this.courseTypesService.create(dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseTypeDto,
  ): Promise<CourseType> {
    return this.courseTypesService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<CourseType> {
    return this.courseTypesService.remove(id);
  }
}
