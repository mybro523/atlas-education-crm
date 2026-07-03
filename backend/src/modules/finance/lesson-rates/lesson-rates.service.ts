import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, LessonRate } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLessonRateDto } from './dto/create-lesson-rate.dto';
import { UpdateLessonRateDto } from './dto/update-lesson-rate.dto';
import { QueryLessonRateDto } from './dto/query-lesson-rate.dto';

/**
 * Lesson-rates: the flexible per-group / global pay rate used as the fallback
 * when a lesson has no explicit `teacherPayRate` (see salary rule §0.6).
 * FOUNDER-only (guarded at the controller).
 */
@Injectable()
export class LessonRatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Plain-array list, optionally scoped to a group. */
  findAll(query: QueryLessonRateDto): Promise<LessonRate[]> {
    const where: Prisma.LessonRateWhereInput = {};
    if (query.groupId) where.groupId = query.groupId;
    return this.prisma.lessonRate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<LessonRate> {
    const rate = await this.prisma.lessonRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException(`LessonRate ${id} not found`);
    return rate;
  }

  async create(dto: CreateLessonRateDto): Promise<LessonRate> {
    if (dto.groupId) await this.assertGroupExists(dto.groupId);
    return this.prisma.lessonRate.create({
      data: {
        groupId: dto.groupId ?? null,
        name: dto.name ?? null,
        amount: new Prisma.Decimal(dto.amount),
      },
    });
  }

  async update(id: string, dto: UpdateLessonRateDto): Promise<LessonRate> {
    await this.findOne(id);
    if (dto.groupId) await this.assertGroupExists(dto.groupId);

    const data: Prisma.LessonRateUpdateInput = {};
    if (dto.groupId !== undefined) {
      data.group = dto.groupId
        ? { connect: { id: dto.groupId } }
        : { disconnect: true };
    }
    if (dto.name !== undefined) data.name = dto.name ?? null;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);

    return this.prisma.lessonRate.update({ where: { id }, data });
  }

  async remove(id: string): Promise<LessonRate> {
    await this.findOne(id);
    return this.prisma.lessonRate.delete({ where: { id } });
  }

  private async assertGroupExists(groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
  }
}
