import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Room } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

/**
 * Flexible Room / kabinet dictionary, managed by ADMIN + FOUNDER. `branchId` is
 * optional (SetNull relation) so a room may be shared or branch-less. Lessons
 * reference rooms via `roomId`.
 */
@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List rooms, optionally filtered by `?branchId` and/or `?active`. */
  findAll(query: QueryRoomDto): Promise<Room[]> {
    const where: Prisma.RoomWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.active !== undefined) where.isActive = query.active;
    return this.prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /** Fetch a single room or throw 404. */
  async findOne(id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  /** Create a room; validates `branchId` references an existing branch. */
  async create(dto: CreateRoomDto): Promise<Room> {
    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }
    return this.prisma.room.create({
      data: {
        name: dto.name,
        color: dto.color,
        isActive: dto.isActive,
        ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      },
    });
  }

  /** Partial update of a room (404 if missing; validates a new `branchId`). */
  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    await this.findOne(id);

    const data: Prisma.RoomUpdateInput = {
      name: dto.name,
      // Nullable scalar: undefined = leave unchanged, null = clear.
      color: dto.color,
      isActive: dto.isActive,
    };
    if (dto.branchId !== undefined) {
      if (dto.branchId) {
        await this.assertBranchExists(dto.branchId);
        data.branch = { connect: { id: dto.branchId } };
      } else {
        data.branch = { disconnect: true };
      }
    }

    return this.prisma.room.update({ where: { id }, data });
  }

  /** Delete a room (404 if missing). */
  async remove(id: string): Promise<Room> {
    await this.findOne(id);
    return this.prisma.room.delete({ where: { id } });
  }

  /** Ensure a branch exists, else 404. */
  private async assertBranchExists(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
  }
}
