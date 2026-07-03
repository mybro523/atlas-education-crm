import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/shared/config';
import { useSessionStore, selectIsAuthenticated } from '@/entities/session';

/**
 * Wraps public-only pages (e.g. /login). Already-authenticated users are
 * bounced to the dashboard so they never see the login screen again.
 */
export function PublicOnlyRoute() {
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
