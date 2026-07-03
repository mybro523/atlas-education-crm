import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/config';
import { useSessionStore, selectIsAuthenticated } from '@/entities/session';

/**
 * Gate for authenticated areas. Unauthenticated users are redirected to
 * /login, preserving the attempted location for post-login return.
 */
export function ProtectedRoute() {
  const isAuthenticated = useSessionStore(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
