import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthedRequest {
  user?: { role?: Role; academyId?: string | null };
}

interface CachedAcademy {
  status: string;
  subscriptionEnd: Date;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;

/**
 * SaaS subscription gate. After authentication, every tenant request checks
 * that the user's academy is ACTIVE and paid-through. Blocked or expired →
 * 403 with a machine-readable message the frontend turns into the
 * "subscription expired" screen. OWNER and public routes are exempt.
 * Academy rows are cached briefly so the gate costs ~0 queries in practice.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly cache = new Map<string, CachedAcademy>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req?.user;
    if (!user || user.role === Role.OWNER || !user.academyId) return true;

    const academy = await this.getAcademy(user.academyId);
    if (!academy) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }
    if (academy.status === 'BLOCKED') {
      throw new ForbiddenException('SUBSCRIPTION_BLOCKED');
    }
    if (academy.subscriptionEnd.getTime() < Date.now()) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }
    return true;
  }

  private async getAcademy(id: string): Promise<CachedAcademy | null> {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit;
    const row = await this.prisma.academy.findUnique({
      where: { id },
      select: { status: true, subscriptionEnd: true },
    });
    if (!row) return null;
    const entry: CachedAcademy = { ...row, fetchedAt: Date.now() };
    this.cache.set(id, entry);
    return entry;
  }

  /** Owner actions (extend/block) call this so changes apply instantly. */
  invalidate(id: string): void {
    this.cache.delete(id);
  }
}
