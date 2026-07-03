import { Suspense, useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/shared/lib/i18n';
import { FullPageSpinner } from '@/shared/ui';

/**
 * Wires i18next into React and keeps <html lang> in sync with the active
 * language for accessibility and correct hyphenation.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng;
    };
    apply(i18n.resolvedLanguage ?? 'ru');
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
    </I18nextProvider>
  );
}
