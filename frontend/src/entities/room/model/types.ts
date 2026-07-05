import type { Branch } from '@/entities/branch';

/**
 * Room / kabinet — a flexible dictionary managed by FOUNDER + ADMIN
 * (backend `/rooms`). A room may be branch-less (`branchId: null`); lessons
 * reference rooms via `roomId`.
 */
export interface Room {
  id: string;
  name: string;
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated only when a caller explicitly includes it. */
  branch?: Branch | null;
}

/** GET /rooms filters (non-paginated dictionary → plain array). */
export interface RoomListParams {
  branchId?: string;
  /** Filter on `isActive`. */
  active?: boolean;
}

export interface CreateRoomDto {
  name: string;
  branchId?: string;
  isActive?: boolean;
}

/** Partial update; `branchId: null` detaches the room from its branch. */
export interface UpdateRoomDto {
  name?: string;
  branchId?: string | null;
  isActive?: boolean;
}
