import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RealtimeGateway } from '../modules/realtime/realtime.gateway';

/** Prisma actions that mutate data, mapped to a coarse realtime action. */
const MUTATING_ACTIONS: Partial<Record<Prisma.PrismaAction, 'created' | 'updated' | 'deleted'>> = {
  create: 'created',
  createMany: 'created',
  update: 'updated',
  updateMany: 'updated',
  upsert: 'updated',
  delete: 'deleted',
  deleteMany: 'deleted',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly realtime: RealtimeGateway) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Broadcast every mutating write as a lightweight realtime signal so all
    // connected clients can invalidate the matching cache and refetch. Runs for
    // ALL models automatically — no per-service wiring. The emit is fire-and-
    // forget and guarded, so it can never fail a database operation.
    this.$use(async (params, next) => {
      const result = await next(params);
      const action = params.action
        ? MUTATING_ACTIONS[params.action as Prisma.PrismaAction]
        : undefined;
      if (action && params.model) {
        const id =
          result && typeof result === 'object' && 'id' in result
            ? (result as { id?: string }).id
            : undefined;
        this.realtime.emitEntityChange(params.model, action, id);
      }
      return result;
    });

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
