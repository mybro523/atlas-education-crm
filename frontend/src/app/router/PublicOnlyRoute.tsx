import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/shared/config';
import {
  useSessionStore,
  selectIsAuthenticated,
  selectAuthReady,
} from '@/entities/session';
import { FullPageSpinner } from '@/shared/ui';

/**
 * Wraps public-only pages (e.g. /login). Already-authenticated users are
 * bounced to the dashboard so they never see the login screen again.
 *
 * Waits for `authReady` first: on a hard refresh the in-memory session starts
 * empty while the cookie-based refresh is in flight, so rendering the login
 * form immediately would flash it for a logged-in user before bouncing them.
 */
export function PublicOnlyRoute() {
  const authReady = useSessionStore(selectAuthReady);
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  if (!authReady) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
