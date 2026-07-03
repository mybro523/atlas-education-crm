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
import { StudentsService, CallerContext } from './students.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { QueryStudentsDto } from './dto/query-students.dto';

/**
 * Students + nested Parents (API contract §6).
 * Reads: ADMIN, FOUNDER, and TEACHER (scoped to their own groups in the service).
 * Writes (students & parents): ADMIN, FOUNDER only.
 * RolesGuard is applied at the class level (all handlers use @Roles).
 */
@UseGuards(RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /** Map the injected auth user to the service's caller context. */
  private caller(user: AuthUser): CallerContext {
    return { userId: user.id, role: user.role };
  }

  // ---- Student reads (ADMIN, FOUNDER, TEACHER own-scope) ---------------

  @Get()
  @Roles(Role.ADMIN, Role.FOUNDER, Role.TEACHER)
  findAll(@Query() query: QueryStudentsDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.findAll(query, this.caller(user));
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FOUNDER, Role.TEACHER)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findOne(id, this.caller(user));
  }

  // ---- Student writes (ADMIN, FOUNDER) ---------------------------------

  @Post()
  @Roles(Role.ADMIN, Role.FOUNDER)
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FOUNDER)
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FOUNDER)
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  // ---- Parents sub-resource --------------------------------------------

  @Get(':id/parents')
  @Roles(Role.ADMIN, Role.FOUNDER, Role.TEACHER)
  findParents(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findParents(id, this.caller(user));
  }

  @Post(':id/parents')
  @Roles(Role.ADMIN, Role.FOUNDER)
  addParent(@Param('id') id: string, @Body() dto: CreateParentDto) {
    return this.studentsService.addParent(id, dto);
  }

  @Patch(':id/parents/:parentId')
  @Roles(Role.ADMIN, Role.FOUNDER)
  updateParent(
    @Param('id') id: string,
    @Param('parentId') parentId: string,
    @Body() dto: UpdateParentDto,
  ) {
    return this.studentsService.updateParent(id, parentId, dto);
  }

  @Delete(':id/parents/:parentId')
  @Roles(Role.ADMIN, Role.FOUNDER)
  removeParent(
    @Param('id') id: string,
    @Param('parentId') parentId: string,
  ) {
    return this.studentsService.removeParent(id, parentId);
  }
}
