/**
 * Shared client-side field validators. Every form in the app funnels through
 * these so the rules — and the localized error keys they map to — stay
 * consistent. Each `isValid*` returns a boolean; pair a failure with the
 * matching `form.*` i18n key noted in its doc comment. Regex constants are
 * exported for zod-based forms (`z.string().regex(NAME_REGEX, …)`).
 *
 * Lives in `shared/lib` so pages / widgets / features can all import it via
 * downward-only FSD imports: `import { isValidPersonName } from '@/shared/lib'`.
 */

/**
 * Person-name characters: a leading Unicode letter followed by letters, spaces,
 * hyphens, apostrophes or dots. Deliberately EXCLUDES digits — a person's name
 * is never "232". Unicode-aware so Cyrillic (ru), Tajik (ғ қ ҳ ҷ ӣ ӯ) and Latin
 * all pass.
 *
 * NOT for entity names (branch «Центр №1», room «Кабинет 1», course, group,
 * category…) which legitimately contain digits — use {@link isNonEmpty} there.
 */
export const NAME_REGEX = /^\p{L}[\p{L}\s'’.-]*$/u;

/** Telegram handle rule (mirrors backend `@Matches`): optional `@` + 5–32 of [A-Za-z0-9_]. */
export const TELEGRAM_REGEX = /^@?[A-Za-z0-9_]{5,32}$/;

/** Pragmatic RFC-lite email. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Money amount as typed: digits with an optional 1–2 decimal part (dot or comma). */
export const AMOUNT_REGEX = /^\d+([.,]\d{1,2})?$/;

/** Backend Decimal(10,2) ceiling shared by every money field. */
export const MONEY_MAX = 99_999_999.99;

/**
 * A valid PERSON name → i18n `form.invalidName`. 2–100 chars, letters +
 * separators, no digits. Use for student / teacher / parent first-last-middle
 * names only.
 */
export function isValidPersonName(value: string): boolean {
  const v = value.trim();
  return v.length >= 2 && v.length <= 100 && NAME_REGEX.test(v);
}

/** Non-empty after trim → i18n `form.requiredField`. Use for required entity names/text. */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Loose international phone → i18n `form.invalidPhone`. 7–15 digits, optional
 * leading `+`, spaces / parens / hyphens allowed.
 */
export function isValidPhone(value: string): boolean {
  const v = value.trim();
  const digits = v.replace(/\D/g, '');
  return /^\+?[\d\s()-]+$/.test(v) && digits.length >= 7 && digits.length <= 15;
}

/** Telegram username → i18n `form.invalidTelegram`. */
export function isValidTelegram(value: string): boolean {
  return TELEGRAM_REGEX.test(value.trim());
}

/** Email → i18n `form.invalidEmail`. */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/**
 * Money amount → i18n `form.invalidAmount` (or the field's own min message).
 * Non-negative by default, ≤ 2 decimals, within {@link MONEY_MAX}. Pass
 * `{ min: 0.01 }` to require a strictly-positive amount.
 */
export function isValidAmount(
  value: string,
  opts: { min?: number; max?: number } = {},
): boolean {
  const { min = 0, max = MONEY_MAX } = opts;
  const v = value.trim();
  if (!AMOUNT_REGEX.test(v)) return false;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max;
}

/** Parse a money string to a number (null when blank or unparseable). */
export function parseAmount(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Today as `YYYY-MM-DD` (local) — the latest sensible birth / past date. */
export function todayInput(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** True when a `YYYY-MM-DD` value is strictly in the future vs today. */
export function isFutureDate(value: string): boolean {
  if (!value) return false;
  return value > todayInput();
}
