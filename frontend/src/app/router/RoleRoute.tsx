import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES, type Role } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';

export interface RoleRouteProps {
  /** Roles permitted to view the nested routes. */
  allow: Role[];
}

/**
 * Role-based gate. Assumes it is nested under ProtectedRoute (user is
 * authenticated). If the current role is not allowed, redirect to the
 * dashboard rather than exposing a forbidden screen.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const role = useSessionStore(selectRole);

  if (!role || !allow.includes(role)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
