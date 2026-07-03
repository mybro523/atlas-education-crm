import { useMutation } from '@tanstack/react-query';
import {
  login as loginRequest,
  useSessionStore,
  type LoginCredentials,
  type LoginResponse,
} from '@/entities/session';
/**
 * Login mutation. On success it writes the session (tokens + user) into the
 * Zustand store, which persists to localStorage and unlocks protected routes.
 */
export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);

  return useMutation<LoginResponse, unknown, LoginCredentials>({
    mutationFn: (credentials) => loginRequest(credentials),
    onSuccess: (data) => {
      setSession({
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
        user: data.user,
      });
    },
  });
}
