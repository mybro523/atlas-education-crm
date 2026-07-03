/**
 * Localized SMS/notification templates (ru / tj / en).
 *
 * These are the shared notification bodies (absence alerts, birthday greetings,
 * announcements) defined in src/i18n/&#42;/notifications.json. They are consumed by
 * background work (the absence cron, broadcasts, the NotificationsService) that
 * runs WITHOUT an HTTP request context, so we import the JSON directly (the
 * project enables `resolveJsonModule`) instead of going through nestjs-i18n's
 * request-scoped I18nService. That keeps the cron and queue deterministic.
 *
 * Bot-specific reply strings live separately in telegram/telegram.i18n.ts.
 */

import ru from '../../i18n/ru/notifications.json';
import tj from '../../i18n/tj/notifications.json';
import en from '../../i18n/en/notifications.json';

export type NotificationLang = 'ru' | 'tj' | 'en';

const SUPPORTED: readonly NotificationLang[] = ['ru', 'tj', 'en'];

/** Union of the template keys present in every locale file. */
export type NotificationTemplateKey = keyof typeof ru;

const TABLES: Record<NotificationLang, Record<string, string>> = { ru, tj, en };

/**
 * Normalize an arbitrary language value (e.g. User.language / Student locale) to
 * a supported notification language, falling back to Russian (the center's
 * default).
 */
export function normalizeNotificationLang(
  lang: string | null | undefined,
): NotificationLang {
  const value = (lang ?? '').toLowerCase().slice(0, 2);
  return (SUPPORTED as readonly string[]).includes(value)
    ? (value as NotificationLang)
    : 'ru';
}

/**
 * Resolve a localized notification template and interpolate `{{placeholder}}`
 * tokens from `vars`. Falls back through the Russian table when a key is missing
 * in the requested locale; unknown keys degrade to the raw key so a missing
 * translation never throws mid-broadcast.
 */
export function renderTemplate(
  template: NotificationTemplateKey | string,
  lang: NotificationLang,
  vars: Record<string, string | number> = {},
): string {
  const table = TABLES[lang] ?? TABLES.ru;
  const raw = table[template] ?? TABLES.ru[template] ?? String(template);
  return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? '' : String(value);
  });
}
