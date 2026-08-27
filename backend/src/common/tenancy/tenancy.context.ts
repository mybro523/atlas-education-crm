import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request tenancy context, carried through the async call chain.
 *
 * - `academyId` set → every Prisma query on a tenant model is automatically
 *   scoped to that academy (see PrismaService middleware).
 * - `bypass` true → no scoping (platform OWNER and internal processes).
 * - No context at all (cron jobs, telegram bot, webhooks) → treated as bypass;
 *   those flows either operate across academies deliberately or set an
 *   explicit academy via {@link runWithTenant}.
 */
export interface TenancyContext {
  academyId?: string;
  bypass?: boolean;
}

/**
 * The platform's own academy (seeded as the first tenant). Externally-fed
 * integrations whose credentials live in global env vars (Meta webhook,
 * Telegram bot) are single-tenant for now and land here explicitly.
 */
export const PLATFORM_ACADEMY_ID = 'academy-atlas';

const als = new AsyncLocalStorage<TenancyContext>();

/** Bind a tenancy context to the current async execution (request lifetime). */
export function enterTenancy(ctx: TenancyContext): void {
  als.enterWith(ctx);
}

/** Run `fn` under an explicit tenancy context (cron/webhook flows). */
export function runWithTenant<T>(ctx: TenancyContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** The active context, or undefined outside any request (internal flows). */
export function getTenancy(): TenancyContext | undefined {
  return als.getStore();
}

/** Academy id to scope queries by, or null when scoping must be skipped. */
export function activeAcademyId(): string | null {
  const ctx = als.getStore();
  if (!ctx || ctx.bypass || !ctx.academyId) return null;
  return ctx.academyId;
}
