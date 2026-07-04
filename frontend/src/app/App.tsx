import '@/app/styles/index.css';
// Ensure i18next is initialized before any component uses translations.
import '@/shared/lib/i18n';
// Side-effect: registers the axios <-> session token bridge on startup.
import '@/entities/session';

import { I18nProvider } from '@/app/providers/I18nProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { ToastProvider } from '@/shared/ui';

/**
 * Application root. Provider order:
 *   I18n (Suspense boundary) → Theme (html class) → Query → Toast → Router.
 * A top-level error boundary keeps a single page crash from blanking the whole app.
 */
export function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryProvider>
          <ToastProvider>
            <AppErrorBoundary>
              <AppRouter />
            </AppErrorBoundary>
          </ToastProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
