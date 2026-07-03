import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subject } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

/**
 * Subjects dictionary (§2). `name` is unique; a duplicate surfaces as a 409.
 */
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all subjects (plain array — dictionaries are not paginated). */
  findAll(): Promise<Subject[]> {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  /** Fetch a single subject or throw 404. */
  async findOne(id: string): Promise<Subject> {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Subject ${id} not found`);
    }
    return subject;
  }

  /** Create a subject; duplicate name → 409. */
  async create(dto: CreateSubjectDto): Promise<Subject> {
    try {
      return await this.prisma.subject.create({ data: { name: dto.name } });
    } catch (error) {
      throw this.mapUniqueError(error, dto.name);
    }
  }

  /** Update a subject (404 if missing, 409 on duplicate name). */
  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    await this.findOne(id);
    try {
      return await this.prisma.subject.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (error) {
      throw this.mapUniqueError(error, dto.name);
    }
  }

  /** Delete a subject (404 if missing). */
  async remove(id: string): Promise<Subject> {
    await this.findOne(id);
    return this.prisma.subject.delete({ where: { id } });
  }

  /**
   * Translate a Prisma unique-constraint violation (P2002) on `name` into a
   * ConflictException; re-throw anything else untouched.
   */
  private mapUniqueError(error: unknown, name?: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(`Subject "${name}" already exists`);
    }
    return error;
  }
}
