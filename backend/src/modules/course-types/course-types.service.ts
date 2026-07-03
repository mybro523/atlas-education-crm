import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseTypeDto } from './dto/create-course-type.dto';
import { UpdateCourseTypeDto } from './dto/update-course-type.dto';
import { QueryCourseTypeDto } from './dto/query-course-type.dto';

/**
 * Flexible CourseType dictionary (§3): Standard / VIP / Intensive / Kids / ...
 * `name` is unique (409 on duplicate); `isActive` toggles availability.
 */
@Injectable()
export class CourseTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /** List course types, optionally filtered by `?active` (plain array). */
  findAll(query: QueryCourseTypeDto): Promise<CourseType[]> {
    const where: Prisma.CourseTypeWhereInput = {};
    if (query.active !== undefined) {
      where.isActive = query.active;
    }
    return this.prisma.courseType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /** Fetch a single course type or throw 404. */
  async findOne(id: string): Promise<CourseType> {
    const courseType = await this.prisma.courseType.findUnique({
      where: { id },
    });
    if (!courseType) {
      throw new NotFoundException(`CourseType ${id} not found`);
    }
    return courseType;
  }

  /** Create a course type; duplicate name → 409. */
  async create(dto: CreateCourseTypeDto): Promise<CourseType> {
    try {
      return await this.prisma.courseType.create({
        data: { name: dto.name, isActive: dto.isActive },
      });
    } catch (error) {
      throw this.mapUniqueError(error, dto.name);
    }
  }

  /** Update a course type (404 if missing, 409 on duplicate name). */
  async update(id: string, dto: UpdateCourseTypeDto): Promise<CourseType> {
    await this.findOne(id);
    try {
      return await this.prisma.courseType.update({
        where: { id },
        data: { name: dto.name, isActive: dto.isActive },
      });
    } catch (error) {
      throw this.mapUniqueError(error, dto.name);
    }
  }

  /** Delete a course type (404 if missing). */
  async remove(id: string): Promise<CourseType> {
    await this.findOne(id);
    return this.prisma.courseType.delete({ where: { id } });
  }

  /** Map a P2002 unique violation on `name` to a 409; re-throw otherwise. */
  private mapUniqueError(error: unknown, name?: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(`CourseType "${name}" already exists`);
    }
    return error;
  }
}
