/**
 * Localized reply templates for the Telegram bot (ru / tj / en).
 *
 * These are bot-specific strings (command replies, help text, link
 * confirmations) and are intentionally kept separate from the SMS/email
 * notification templates in the src/i18n locale folders (notifications.json),
 * which are owned by the NotificationsService. Absence / birthday notification
 * text still comes from those shared files.
 */

export type SupportedLang = 'ru' | 'tj' | 'en';

const SUPPORTED: readonly SupportedLang[] = ['ru', 'tj', 'en'];

/**
 * Normalize an arbitrary language string (e.g. User.language) to a supported
 * bot language, falling back to Russian (the center's default).
 */
export function normalizeLang(lang: string | null | undefined): SupportedLang {
  const value = (lang ?? '').toLowerCase().slice(0, 2);
  return (SUPPORTED as readonly string[]).includes(value)
    ? (value as SupportedLang)
    : 'ru';
}

type Dict = Record<SupportedLang, string>;

const T = {
  // Shown on /start with no (or an unknown) payload code.
  welcome: {
    ru: 'Здравствуйте! Это бот образовательного центра «Atlas».\nЧтобы привязать аккаунт, откройте раздел «Telegram» в CRM и нажмите «Привязать».',
    tj: 'Салом! Ин боти маркази таълимии «Atlas» аст.\nБарои пайваст кардани ҳисоб, бахши «Telegram»-ро дар CRM кушоед ва «Пайваст»-ро зер кунед.',
    en: 'Hello! This is the «Atlas» educational center bot.\nTo link your account, open the «Telegram» section in the CRM and tap «Link».',
  } satisfies Dict,

  linkSuccess: {
    ru: 'Готово! Ваш Telegram привязан к аккаунту «Atlas».\nДоступные команды: /grades /schedule /performance /help',
    tj: 'Тайёр! Telegram-и шумо ба ҳисоби «Atlas» пайваст шуд.\nФармонҳо: /grades /schedule /performance /help',
    en: 'Done! Your Telegram is linked to your «Atlas» account.\nAvailable commands: /grades /schedule /performance /help',
  } satisfies Dict,

  linkInvalid: {
    ru: 'Ссылка для привязки недействительна или устарела. Сгенерируйте новую в CRM.',
    tj: 'Пайванди пайвасткунӣ нодуруст ё кӯҳна аст. Дар CRM пайванди навро эҷод кунед.',
    en: 'The link is invalid or has expired. Please generate a new one in the CRM.',
  } satisfies Dict,

  linkUserGone: {
    ru: 'Аккаунт не найден. Обратитесь к администратору.',
    tj: 'Ҳисоб ёфт нашуд. Ба маъмур муроҷиат кунед.',
    en: 'Account not found. Please contact an administrator.',
  } satisfies Dict,

  notLinked: {
    ru: 'Ваш Telegram ещё не привязан. Откройте раздел «Telegram» в CRM и нажмите «Привязать».',
    tj: 'Telegram-и шумо ҳанӯз пайваст нашудааст. Дар CRM бахши «Telegram»-ро кушоед ва «Пайваст»-ро зер кунед.',
    en: 'Your Telegram is not linked yet. Open the «Telegram» section in the CRM and tap «Link».',
  } satisfies Dict,

  help: {
    ru: 'Команды бота «Atlas»:\n/grades — последние оценки\n/schedule — ближайшее расписание\n/performance — успеваемость\n/help — эта справка',
    tj: 'Фармонҳои боти «Atlas»:\n/grades — баҳоҳои охирин\n/schedule — ҷадвали наздик\n/performance — пешрафт\n/help — ин кӯмак',
    en: 'Atlas bot commands:\n/grades — recent grades\n/schedule — upcoming schedule\n/performance — performance\n/help — this help',
  } satisfies Dict,

  // Header lines for command replies.
  gradesHeader: {
    ru: '📊 Ваши последние оценки:',
    tj: '📊 Баҳоҳои охирини шумо:',
    en: '📊 Your recent grades:',
  } satisfies Dict,

  scheduleHeader: {
    ru: '📅 Ваше расписание:',
    tj: '📅 Ҷадвали шумо:',
    en: '📅 Your schedule:',
  } satisfies Dict,

  performanceHeader: {
    ru: '📈 Ваша успеваемость:',
    tj: '📈 Пешрафти шумо:',
    en: '📈 Your performance:',
  } satisfies Dict,

  teacherScheduleHeader: {
    ru: '📅 Ваше расписание занятий:',
    tj: '📅 Ҷадвали дарсҳои шумо:',
    en: '📅 Your teaching schedule:',
  } satisfies Dict,

  noGrades: {
    ru: 'Пока нет оценок.',
    tj: 'Ҳоло баҳо нест.',
    en: 'No grades yet.',
  } satisfies Dict,

  noSchedule: {
    ru: 'Ближайших занятий не найдено.',
    tj: 'Дарсҳои наздик ёфт нашуд.',
    en: 'No upcoming lessons found.',
  } satisfies Dict,

  noPerformance: {
    ru: 'Пока нет данных об успеваемости.',
    tj: 'Ҳоло маълумот дар бораи пешрафт нест.',
    en: 'No performance data yet.',
  } satisfies Dict,

  // Command replies aimed at a role that has no such data.
  gradesForStudentsOnly: {
    ru: 'Оценки доступны только для студентов.',
    tj: 'Баҳоҳо танҳо барои донишҷӯён дастрасанд.',
    en: 'Grades are available for students only.',
  } satisfies Dict,

  performanceForStudentsOnly: {
    ru: 'Успеваемость доступна только для студентов.',
    tj: 'Пешрафт танҳо барои донишҷӯён дастрас аст.',
    en: 'Performance is available for students only.',
  } satisfies Dict,

  profileMissing: {
    ru: 'Профиль не найден. Обратитесь к администратору.',
    tj: 'Профил ёфт нашуд. Ба маъмур муроҷиат кунед.',
    en: 'Profile not found. Please contact an administrator.',
  } satisfies Dict,

  error: {
    ru: 'Произошла ошибка. Попробуйте позже.',
    tj: 'Хатогӣ рух дод. Дертар кӯшиш кунед.',
    en: 'An error occurred. Please try again later.',
  } satisfies Dict,

  // Labels used when formatting rows.
  average: {
    ru: 'Средний балл',
    tj: 'Баҳои миёна',
    en: 'Average',
  } satisfies Dict,

  absences: {
    ru: 'Пропуски',
    tj: 'Ғоибҳо',
    en: 'Absences',
  } satisfies Dict,

  overall: {
    ru: 'Итого',
    tj: 'Ҳамагӣ',
    en: 'Overall',
  } satisfies Dict,
} as const;

export type TelegramMessageKey = keyof typeof T;

/** Return a localized bot string, falling back through ru. */
export function tg(key: TelegramMessageKey, lang: SupportedLang): string {
  const entry = T[key];
  return entry[lang] ?? entry.ru;
}
