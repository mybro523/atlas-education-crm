import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ListGroupsQueryDto } from './dto/list-groups.query.dto';
import { ListMembersQueryDto } from './dto/list-members.query.dto';
import { ListAvailableStudentsQueryDto } from './dto/list-available-students.query.dto';
import { AddGroupStudentDto } from './dto/add-group-student.dto';

/**
 * Groups (study groups). Reading is open to any authenticated staff role.
 * Group CRUD is ADMIN + FOUNDER. Member add/remove additionally allows a
 * TEACHER for THEIR OWN groups (ownership enforced in the service).
 */
@UseGuards(RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // ---- Read (any authenticated user) --------------------------------------

  @Get()
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  findAll(@Query() query: ListGroupsQueryDto) {
    return this.groupsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  // ---- Write (ADMIN + FOUNDER) --------------------------------------------

  @Post()
  @Roles(Role.FOUNDER, Role.ADMIN)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.FOUNDER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.FOUNDER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  // ---- Members ------------------------------------------------------------

  @Get(':id/students')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.SALES_MANAGER, Role.TEACHER)
  listStudents(
    @Param('id') id: string,
    @Query() query: ListMembersQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.listStudents(id, query.includeLeft ?? false, user);
  }

  @Get(':id/available-students')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.TEACHER)
  listAvailableStudents(
    @Param('id') id: string,
    @Query() query: ListAvailableStudentsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.listAvailableStudents(id, query, user);
  }

  @Post(':id/students')
  @Roles(Role.FOUNDER, Role.ADMIN, Role.TEACHER)
  addStudent(
    @Param('id') id: string,
    @Body() dto: AddGroupStudentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.addStudent(id, dto.studentId, user);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FOUNDER, Role.ADMIN, Role.TEACHER)
  removeStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.removeStudent(id, studentId, user);
  }
}
