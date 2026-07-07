import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Editable system settings with safe defaults. The value store is a simple
 * key-value table so the founder can tune behavior without code changes.
 */
export const SETTING_DEFAULTS: Record<string, string> = {
  /** Look-ahead window (days) for the "payment due soon" panel. */
  paymentDueDays: '3',
  /** Consecutive missed lessons that trigger the parent SMS. */
  absenceSmsThreshold: '3',
  /** Default lesson duration (minutes) suggested by the schedule form. */
  defaultLessonDurationMin: '120',
  /** Minimum password length for issued accounts. */
  passwordMinLength: '4',
  /** Whether ADMIN role can see the finance section (in addition to FOUNDER). */
  adminCanSeeFinance: 'false',
};

const KNOWN_KEYS = new Set(Object.keys(SETTING_DEFAULTS));

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All settings — stored values merged over defaults. */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany();
    const merged: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      merged[row.key] = row.value;
    }
    return merged;
  }

  /** One setting value (string), falling back to its default. */
  async get(key: string): Promise<string | undefined> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? SETTING_DEFAULTS[key];
  }

  /** Numeric helper with default fallback. */
  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Upsert a batch of settings. Only known keys are accepted. */
  async updateMany(entries: Record<string, string>) {
    const keys = Object.keys(entries ?? {});
    if (keys.length === 0) {
      throw new BadRequestException('No settings provided');
    }
    for (const key of keys) {
      if (!KNOWN_KEYS.has(key)) {
        throw new BadRequestException(`Unknown setting: ${key}`);
      }
      const value = String(entries[key]);
      if (value.length > 200) {
        throw new BadRequestException(`Value for ${key} is too long`);
      }
    }

    await this.prisma.$transaction(
      keys.map((key) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: String(entries[key]) },
          update: { value: String(entries[key]) },
        }),
      ),
    );
    return this.getAll();
  }
}
