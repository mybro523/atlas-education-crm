import { useMutation } from '@tanstack/react-query';
import {
  login as loginRequest,
  useSessionStore,
  type LoginCredentials,
  type LoginResponse,
} from '@/entities/session';
/**
 * Login mutation. On success it writes the session (access token + user) into
 * the in-memory Zustand store, which unlocks protected routes. No token is
 * persisted to localStorage — the refresh token lives in an httpOnly cookie
 * set by the backend on this same request.
 */
export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);

  return useMutation<LoginResponse, unknown, LoginCredentials>({
    mutationFn: (credentials) => loginRequest(credentials),
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, user: data.user });
    },
  });
}
