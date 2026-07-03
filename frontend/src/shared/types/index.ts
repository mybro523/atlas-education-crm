import type { Role } from '@/shared/config';

/** Authenticated user as returned by the backend (GET /auth/me). */
export interface User {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
  language: string;
  branchId: string | null;
  avatarUrl?: string | null;
}

/** JWT token pair. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Standard error envelope surfaced to the UI. */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

/** Generic id-only reference. */
export interface EntityRef {
  id: string;
  name: string;
}
