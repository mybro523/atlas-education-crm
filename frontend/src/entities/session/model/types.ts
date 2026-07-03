import type { AuthTokens, User } from '@/shared/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Backend response for POST /auth/login — tokens plus the user profile. */
export interface LoginResponse extends AuthTokens {
  user: User;
}

export type { AuthTokens, User };
