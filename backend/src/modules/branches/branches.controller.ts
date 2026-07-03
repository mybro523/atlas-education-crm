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
import { Branch } from '@prisma/client';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * `/api/branches` (§1). RolesGuard is added because it is NOT global (§0.1).
 * Reads are open to any authenticated user (no @Roles); writes are restricted
 * to ADMIN + FOUNDER.
 */
@UseGuards(RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(): Promise<Branch[]> {
    return this.branchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Branch> {
    return this.branchesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Post()
  create(@Body() dto: CreateBranchDto): Promise<Branch> {
    return this.branchesService.create(dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<Branch> {
    return this.branchesService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.FOUNDER)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<Branch> {
    return this.branchesService.remove(id);
  }
}
