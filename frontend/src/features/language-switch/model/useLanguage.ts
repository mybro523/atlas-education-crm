import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '@/shared/config';

/** Hook exposing the current language and a setter over i18next. */
export function useLanguage(): {
  language: Language;
  languages: readonly Language[];
  setLanguage: (lng: Language) => void;
} {
  const { i18n } = useTranslation();
  const resolved = i18n.resolvedLanguage as Language | undefined;
  const language: Language =
    resolved && LANGUAGES.includes(resolved) ? resolved : 'ru';

  return {
    language,
    languages: LANGUAGES,
    setLanguage: (lng) => {
      void i18n.changeLanguage(lng);
    },
  };
}
