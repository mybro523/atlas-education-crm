import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateEmployeeDto } from './dto/create-employee.dto';

const BCRYPT_ROUNDS = 12;

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  phone: true,
  role: true,
  language: true,
  branchId: true,
  isActive: true,
  createdAt: true,
} as const;

// Staff listing needs the human name from whichever profile the user carries.
const STAFF_INCLUDE = {
  branch: { select: { id: true, name: true } },
  teacherProfile: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
  employee: {
    select: { id: true, firstName: true, lastName: true, position: true },
  },
  studentProfile: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.UserInclude;

type StaffUser = Prisma.UserGetPayload<{
  include: typeof STAFF_INCLUDE;
}>;

function serializeStaff(user: StaffUser) {
  const { passwordHash: _hash, ...rest } = user;
  const profile = user.teacherProfile ?? user.employee ?? user.studentProfile;
  return {
    ...rest,
    fullName: profile
      ? `${profile.lastName} ${profile.firstName}`
      : (user.email ?? user.id),
    position: user.employee?.position ?? null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** All non-student accounts (staff) with profile names, newest first. */
  async findStaff() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: 'STUDENT' } },
      include: STAFF_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(serializeStaff);
  }

  findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_USER_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_FIELDS,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Create a staff account with a login + password. TEACHER accounts get a
   * Teacher profile (branch required); other roles get an Employee profile.
   */
  async createEmployee(dto: CreateEmployeeDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.role === Role.TEACHER && !dto.branchId) {
      throw new BadRequestException(
        'branchId is required for TEACHER accounts',
      );
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true },
      });
      if (!branch) {
        throw new NotFoundException(`Branch ${dto.branchId} not found`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Non-teacher staff need an Employee profile whose branch is mandatory.
    const employeeBranchId =
      dto.branchId ??
      (
        await this.prisma.branch.findFirstOrThrow({
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        })
      ).id;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        branchId: dto.branchId ?? null,
        ...(dto.role === Role.TEACHER
          ? {
              teacherProfile: {
                create: {
                  firstName: dto.firstName,
                  lastName: dto.lastName,
                  branchId: dto.branchId as string,
                },
              },
            }
          : {
              employee: {
                create: {
                  firstName: dto.firstName,
                  lastName: dto.lastName,
                  position: dto.position ?? null,
                  branchId: employeeBranchId,
                },
              },
            }),
      },
      include: STAFF_INCLUDE,
    });

    return serializeStaff(user);
  }

  /** Reset a user's password (founder action) and revoke active sessions. */
  async resetPassword(id: string, password: string) {
    await this.ensureExists(id);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { id, ok: true };
  }

  /** Block / unblock an account. A blocked user cannot log in or refresh. */
  async setBlocked(id: string, blocked: boolean, callerId: string) {
    if (id === callerId) {
      throw new BadRequestException('You cannot block your own account');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.FOUNDER && blocked) {
      throw new BadRequestException('The founder account cannot be blocked');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: !blocked },
    });
    if (blocked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { id, isActive: !blocked };
  }

  /** Delete a staff account. Profile rows survive; their user link nulls out. */
  async remove(id: string, callerId: string) {
    if (id === callerId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.FOUNDER) {
      throw new BadRequestException('The founder account cannot be deleted');
    }
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('User not found');
  }
}
