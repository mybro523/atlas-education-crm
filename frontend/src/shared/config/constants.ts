/** App-wide constants. */

export const APP_NAME = 'Atlas CRM';

/** Base URL of the backend REST API. Falls back to local dev default. */
export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** localStorage keys. */
export const STORAGE_KEYS = {
  theme: 'atlas.theme',
  language: 'atlas.language',
  auth: 'atlas.auth',
} as const;

/** Supported UI languages (ru is the default). */
export const LANGUAGES = ['ru', 'tj', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'ru';

/** Finance currency. */
export const CURRENCY = 'TJS';

/** Route path constants (single source of truth for router + navigation). */
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  students: '/students',
  teachers: '/teachers',
  groups: '/groups',
  courses: '/courses',
  branches: '/branches',
  subjects: '/subjects',
  courseTypes: '/course-types',
  schedule: '/schedule',
  journal: '/journal',
  finance: '/finance',
  studentCabinet: '/my',
  teacherCabinet: '/my-teaching',
  chats: '/chats',
  broadcast: '/broadcast',
  settings: '/settings',
} as const;
