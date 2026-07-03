import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { DEFAULT_LANGUAGE, LANGUAGES, STORAGE_KEYS } from '@/shared/config';

import ruCommon from './locales/ru/common.json';
import tjCommon from './locales/tj/common.json';
import enCommon from './locales/en/common.json';

export const resources = {
  ru: { common: ruCommon },
  tj: { common: tjCommon },
  en: { common: enCommon },
} as const;

/**
 * Initialize i18next once. Language is detected from localStorage first,
 * then the browser, and falls back to Russian (the product default).
 */
if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...LANGUAGES],
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false, // React already escapes.
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: STORAGE_KEYS.language,
        caches: ['localStorage'],
      },
    });
}

export default i18n;
