import '@/app/styles/index.css';
// Ensure i18next is initialized before any component uses translations.
import '@/shared/lib/i18n';
// Side-effect: registers the axios <-> session token bridge on startup.
import '@/entities/session';

import { I18nProvider } from '@/app/providers/I18nProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AppRouter } from '@/app/router';

/**
 * Application root. Provider order:
 *   I18n (Suspense boundary) → Theme (html class) → Query → Router.
 */
export function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryProvider>
          <AppRouter />
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
