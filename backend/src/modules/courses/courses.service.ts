import { Injectable, NotFoundException } from '@nestjs/common';
import { Course, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';

/** Relations returned on the detail GET (§4). */
const courseDetailInclude = {
  courseType: true,
  branch: true,
} satisfies Prisma.CourseInclude;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paginated course list with optional branch / courseType / active filters
   * and case-insensitive name search.
   */
  async findAll(query: QueryCourseDto): Promise<PaginatedResult<Course>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.CourseWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.courseTypeId) where.courseTypeId = query.courseTypeId;
    if (query.active !== undefined) where.isActive = query.active;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: courseDetailInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.course.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  /** Fetch a single course (with relations) or throw 404. */
  async findOne(id: string): Promise<Course> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: courseDetailInclude,
    });
    if (!course) {
      throw new NotFoundException(`Course ${id} not found`);
    }
    return course;
  }

  /** Create a course after validating all foreign keys exist. */
  async create(dto: CreateCourseDto): Promise<Course> {
    await this.assertRelations(dto.courseTypeId, dto.branchId);

    return this.prisma.course.create({
      data: {
        name: dto.name,
        courseTypeId: dto.courseTypeId,
        branchId: dto.branchId,
        pricePerMonth: dto.pricePerMonth,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
      },
      include: courseDetailInclude,
    });
  }

  /** Update a course (404 if missing / any provided FK is invalid). */
  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    await this.findOne(id);
    await this.assertRelations(dto.courseTypeId, dto.branchId);

    const data: Prisma.CourseUpdateInput = {
      name: dto.name,
      pricePerMonth: dto.pricePerMonth,
      isActive: dto.isActive,
    };
    if (dto.courseTypeId !== undefined) {
      data.courseType = { connect: { id: dto.courseTypeId } };
    }
    if (dto.branchId !== undefined) {
      data.branch = { connect: { id: dto.branchId } };
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.prisma.course.update({
      where: { id },
      data,
      include: courseDetailInclude,
    });
  }

  /** Delete a course (404 if missing). */
  async remove(id: string): Promise<Course> {
    await this.findOne(id);
    return this.prisma.course.delete({ where: { id } });
  }

  /**
   * Verify that each provided foreign key references an existing row. Any
   * `undefined` id is skipped (nothing to change). Missing referent → 404.
   */
  private async assertRelations(
    courseTypeId?: string,
    branchId?: string,
  ): Promise<void> {
    if (courseTypeId !== undefined) {
      const courseType = await this.prisma.courseType.findUnique({
        where: { id: courseTypeId },
        select: { id: true },
      });
      if (!courseType) {
        throw new NotFoundException(`CourseType ${courseTypeId} not found`);
      }
    }

    if (branchId !== undefined) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      });
      if (!branch) {
        throw new NotFoundException(`Branch ${branchId} not found`);
      }
    }
  }
}
