import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/config';
import {
  useSessionStore,
  selectIsAuthenticated,
  selectAuthReady,
} from '@/entities/session';
import { FullPageSpinner } from '@/shared/ui';

/**
 * Gate for authenticated areas. Waits for the auth-bootstrap to settle
 * (`authReady`) before deciding — otherwise a hard refresh, which starts with
 * an empty in-memory session, would wrongly bounce a logged-in user to /login
 * before the cookie-based refresh completes. Once ready, unauthenticated users
 * are redirected to /login, preserving the attempted location.
 */
export function ProtectedRoute() {
  const authReady = useSessionStore(selectAuthReady);
  const isAuthenticated = useSessionStore(selectIsAuthenticated);
  const location = useLocation();

  if (!authReady) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
