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
import { useAuthBootstrap } from '@/entities/session';

/**
 * Restores the in-memory session from the httpOnly refresh cookie on startup,
 * then renders the router. Kept as an inner component so the bootstrap effect
 * runs inside the app tree (and the route guards observe `authReady`).
 */
function AppShell() {
  useAuthBootstrap();
  return <AppRouter />;
}

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
              <AppShell />
            </AppErrorBoundary>
          </ToastProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
