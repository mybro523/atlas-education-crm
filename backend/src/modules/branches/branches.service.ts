import { Injectable, NotFoundException } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

/**
 * Branches are a simple org dictionary (§1). A branch is a tag: all staff can
 * read every branch; only ADMIN/FOUNDER mutate (enforced at the controller).
 */
@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all branches (plain array — dictionaries are not paginated). */
  findAll(): Promise<Branch[]> {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  /** Fetch a single branch or throw 404. */
  async findOne(id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }
    return branch;
  }

  /** Create a branch. */
  create(dto: CreateBranchDto): Promise<Branch> {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  /** Update a branch (404 if it does not exist). */
  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  /** Delete a branch (404 if it does not exist). */
  async remove(id: string): Promise<Branch> {
    await this.findOne(id);
    return this.prisma.branch.delete({ where: { id } });
  }
}
