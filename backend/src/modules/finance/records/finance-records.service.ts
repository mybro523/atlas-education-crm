import { Injectable, NotFoundException } from '@nestjs/common';
import { FinanceRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../../common/dto/pagination.dto';
import { CreateFinanceRecordDto } from './dto/create-finance-record.dto';
import { UpdateFinanceRecordDto } from './dto/update-finance-record.dto';
import { QueryFinanceRecordDto } from './dto/query-finance-record.dto';

/**
 * FinanceRecord CRUD (income / expense ledger). FOUNDER-only (guarded at the
 * controller). Amounts are TJS decimals.
 */
@Injectable()
export class FinanceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryFinanceRecordDto,
  ): Promise<PaginatedResult<FinanceRecord>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.financeRecord.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.financeRecord.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<FinanceRecord> {
    const record = await this.prisma.financeRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`FinanceRecord ${id} not found`);
    return record;
  }

  async create(dto: CreateFinanceRecordDto): Promise<FinanceRecord> {
    await this.assertBranchExists(dto.branchId);
    return this.prisma.financeRecord.create({
      data: {
        branchId: dto.branchId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        category: dto.category ?? null,
        description: dto.description ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateFinanceRecordDto,
  ): Promise<FinanceRecord> {
    await this.findOne(id);
    if (dto.branchId) await this.assertBranchExists(dto.branchId);

    const data: Prisma.FinanceRecordUpdateInput = {};
    if (dto.branchId !== undefined)
      data.branch = { connect: { id: dto.branchId } };
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.category !== undefined) data.category = dto.category ?? null;
    if (dto.description !== undefined)
      data.description = dto.description ?? null;
    if (dto.occurredAt !== undefined) data.occurredAt = new Date(dto.occurredAt);

    return this.prisma.financeRecord.update({ where: { id }, data });
  }

  async remove(id: string): Promise<FinanceRecord> {
    await this.findOne(id);
    return this.prisma.financeRecord.delete({ where: { id } });
  }

  private buildWhere(
    query: QueryFinanceRecordDto,
  ): Prisma.FinanceRecordWhereInput {
    const where: Prisma.FinanceRecordWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.branchId) where.branchId = query.branchId;

    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to) where.occurredAt.lte = new Date(query.to);
    }

    if (query.search) {
      where.OR = [
        { category: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async assertBranchExists(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);
  }
}
