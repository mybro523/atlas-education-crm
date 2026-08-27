import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RealtimeGateway } from '../modules/realtime/realtime.gateway';
import { activeAcademyId } from '../common/tenancy/tenancy.context';

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

/** Models that carry an academyId column and must be tenant-scoped. */
const TENANT_MODELS = new Set([
  'Branch', 'User', 'Student', 'Parent', 'Teacher', 'Employee', 'Room',
  'CourseType', 'Course', 'Group', 'Lesson', 'LessonRate', 'Grade',
  'Attendance', 'Remark', 'Payment', 'FinanceRecord', 'Salary',
  'Conversation', 'Message', 'Broadcast', 'Notification', 'SystemSetting',
]);

/** Read actions that accept an arbitrary `where` we can AND academyId into. */
const FILTERABLE_ACTIONS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate',
  'groupBy', 'updateMany', 'deleteMany',
]);

/** Unique-where actions: the row must be pre-checked to belong to the tenant. */
const UNIQUE_ACTIONS = new Set([
  'findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert',
]);

/** True for a Prisma nested-relation write object ({connect}/{create}/…). */
function isRelationObject(v: unknown): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    ('connect' in v || 'create' in v || 'connectOrCreate' in v)
  );
}

/**
 * Inject the tenant into a create `data` payload. Prisma has two mutually
 * exclusive input shapes: the UNCHECKED one takes scalar FKs (academyId), the
 * CHECKED one only nested relations (academy: {connect}). Mixing them throws,
 * so pick the matching shape by inspecting what the service already passed.
 */
function withTenant(
  data: Record<string, unknown>,
  academyId: string,
): Record<string, unknown> {
  const usesChecked = Object.values(data ?? {}).some(isRelationObject);
  return usesChecked
    ? { academy: { connect: { id: academyId } }, ...data }
    : { academyId, ...data };
}

/** Flatten composite unique selectors ({a_b: {a, b}} → {a, b}) for findFirst. */
function flattenUniqueWhere(where: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where ?? {})) {
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      key.includes('_') && !('equals' in (value as object))
    ) {
      Object.assign(out, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly realtime: RealtimeGateway) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // -----------------------------------------------------------------------
    // SaaS tenancy: transparently scope EVERY query on tenant models to the
    // academy bound to the current request (see TenancyInterceptor). Services
    // stay tenancy-unaware — there is no per-service wiring to forget.
    // - list/aggregate/bulk actions: AND academyId into `where`
    // - create/createMany: inject academyId into `data`
    // - unique-selector actions (update/delete/findUnique/upsert): pre-check
    //   the row belongs to the academy; a foreign row behaves as missing
    //   (P2025 → global filter → 404), never as another tenant's data.
    // No context / OWNER → bypass (owner panel + internal cron/webhook flows).
    // -----------------------------------------------------------------------
    this.$use(async (params, next) => {
      const academyId = activeAcademyId();
      const model = params.model as string | undefined;
      if (!academyId || !model || !TENANT_MODELS.has(model)) {
        return next(params);
      }
      const action = params.action as string;
      params.args = params.args ?? {};

      if (FILTERABLE_ACTIONS.has(action)) {
        params.args.where = { AND: [{ academyId }, params.args.where ?? {}] };
      } else if (action === 'create') {
        params.args.data = withTenant(params.args.data ?? {}, academyId);
      } else if (action === 'createMany') {
        const data = params.args.data;
        // createMany only ever takes the unchecked (scalar-FK) shape.
        params.args.data = Array.isArray(data)
          ? data.map((d: Record<string, unknown>) => ({ academyId, ...d }))
          : { academyId, ...(data ?? {}) };
      } else if (UNIQUE_ACTIONS.has(action)) {
        const flat = flattenUniqueWhere(params.args.where ?? {});
        const delegate = (this as unknown as Record<string, {
          findFirst: (a: unknown) => Promise<unknown>;
        }>)[model.charAt(0).toLowerCase() + model.slice(1)];
        const owned = await delegate.findFirst({
          where: { AND: [flat, { academyId }] },
          select: undefined,
        });
        if (!owned) {
          if (action === 'findUnique') return null;
          if (action === 'upsert') {
            // No owned row → treat as pure create within the tenant.
            params.action = 'create';
            params.args = {
              data: withTenant(params.args.create ?? {}, academyId),
            };
            return next(params);
          }
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: Prisma.prismaVersion.client,
          });
        }
        if (action === 'upsert') {
          params.args.create = withTenant(params.args.create ?? {}, academyId);
        }
      }
      return next(params);
    });

    // Broadcast every mutating write as a lightweight realtime signal so all
    // connected clients can invalidate the matching cache and refetch. Runs for
    // ALL models automatically — no per-service wiring. The emit is fire-and-
    // forget and guarded, so it can never fail a database operation. The event
    // is delivered only to sockets of the same academy (or platform-wide when
    // no tenant context exists, e.g. cron flows).
    this.$use(async (params, next) => {
      const academyId = activeAcademyId();
      const result = await next(params);
      const action = params.action
        ? MUTATING_ACTIONS[params.action as Prisma.PrismaAction]
        : undefined;
      if (action && params.model) {
        const record = result as { id?: string; academyId?: string } | null;
        const id =
          record && typeof record === 'object' && 'id' in record
            ? record.id
            : undefined;
        this.realtime.emitEntityChange(
          params.model,
          action,
          id,
          academyId ?? record?.academyId,
        );
      }
      return result;
    });

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
