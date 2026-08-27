import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AcademyStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import {
  CreateAcademyDto,
  ExtendAcademyDto,
  SetAcademyStatusDto,
  UpdateAcademyDto,
} from './dto/owner.dto';

const BCRYPT_ROUNDS = 12;

/** The platform's own academy cannot be deleted from the panel. */
const PROTECTED_ACADEMY_ID = 'academy-atlas';

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Owner panel backend: client academies, their subscription terms, the sales
 * ledger and per-academy usage stats. All queries here run under tenancy
 * BYPASS (OWNER role), so academy filters are explicit.
 */
@Injectable()
export class OwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGuard: SubscriptionGuard,
  ) {}

  /** All academies with usage stats, newest first. */
  async list() {
    const academies = await this.prisma.academy.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { salesPayments: true } } },
    });
    return Promise.all(
      academies.map(async (a) => {
        const [students, teachers, users, revenue, lastToken] =
          await Promise.all([
            this.prisma.student.count({ where: { academyId: a.id } }),
            this.prisma.teacher.count({ where: { academyId: a.id } }),
            this.prisma.user.count({ where: { academyId: a.id } }),
            this.prisma.academyPayment.aggregate({
              where: { academyId: a.id },
              _sum: { amount: true },
            }),
            this.prisma.refreshToken.findFirst({
              where: { user: { academyId: a.id } },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          ]);
        return {
          ...a,
          stats: {
            students,
            teachers,
            users,
            revenue: revenue._sum.amount ?? 0,
            lastLoginAt: lastToken?.createdAt ?? null,
          },
        };
      }),
    );
  }

  /** Create a client academy together with its founder account (one sale). */
  async create(dto: CreateAcademyDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.founderEmail },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const now = new Date();
    const subscriptionEnd = addMonths(now, dto.months);
    const passwordHash = await bcrypt.hash(dto.founderPassword, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const academy = await tx.academy.create({
        data: {
          name: dto.name,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          subscriptionStart: now,
          subscriptionEnd,
          note: dto.note,
        },
      });
      await tx.user.create({
        data: {
          email: dto.founderEmail,
          passwordHash,
          role: Role.FOUNDER,
          language: 'ru',
          academyId: academy.id,
        },
      });
      if (dto.amount !== undefined && dto.amount > 0) {
        await tx.academyPayment.create({
          data: {
            academyId: academy.id,
            amount: dto.amount,
            periodStart: now,
            periodEnd: subscriptionEnd,
            note: dto.note,
          },
        });
      }
      return academy;
    });
  }

  /** Prolong a subscription from max(now, current end) and record the sale. */
  async extend(id: string, dto: ExtendAcademyDto) {
    const academy = await this.ensure(id);
    const base =
      academy.subscriptionEnd.getTime() > Date.now()
        ? academy.subscriptionEnd
        : new Date();
    const newEnd = addMonths(base, dto.months);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.academy.update({
        where: { id },
        data: { subscriptionEnd: newEnd },
      });
      if (dto.amount !== undefined && dto.amount > 0) {
        await tx.academyPayment.create({
          data: {
            academyId: id,
            amount: dto.amount,
            periodStart: base,
            periodEnd: newEnd,
            note: dto.note,
          },
        });
      }
      return row;
    });
    this.subscriptionGuard.invalidate(id);
    return updated;
  }

  async update(id: string, dto: UpdateAcademyDto) {
    await this.ensure(id);
    return this.prisma.academy.update({ where: { id }, data: { ...dto } });
  }

  async setStatus(id: string, dto: SetAcademyStatusDto) {
    await this.ensure(id);
    const updated = await this.prisma.academy.update({
      where: { id },
      data: { status: dto.status },
    });
    this.subscriptionGuard.invalidate(id);
    return updated;
  }

  /** Delete an academy and (via DB cascade) every row it owns. */
  async remove(id: string) {
    if (id === PROTECTED_ACADEMY_ID) {
      throw new BadRequestException('The platform academy cannot be deleted');
    }
    await this.ensure(id);
    await this.prisma.academy.delete({ where: { id } });
    this.subscriptionGuard.invalidate(id);
    return { id };
  }

  /** Sales ledger: one academy's payments, or all with academy names. */
  async payments(academyId?: string) {
    const where = academyId ? { academyId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.academyPayment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        include: { academy: { select: { name: true } } },
      }),
      this.prisma.academyPayment.aggregate({ where, _sum: { amount: true } }),
    ]);
    return { items, totalAmount: total._sum.amount ?? 0 };
  }

  private async ensure(id: string) {
    const academy = await this.prisma.academy.findUnique({ where: { id } });
    if (!academy) throw new NotFoundException(`Academy ${id} not found`);
    return academy;
  }
}
