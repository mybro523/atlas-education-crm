import type { PaginationParams } from '@/shared/lib/query';

/** Who receives an SMS broadcast (INTEGRATION API). */
export type BroadcastAudience = 'ALL_STUDENTS' | 'ALL_TEACHERS' | 'BOTH';

/**
 * Delivery status of a broadcast. `QUEUED`/`SENDING` are transient while the
 * SMS jobs drain; `SENT` (or `PARTIAL`) is terminal. The backend is the source
 * of truth, so the union stays permissive.
 */
export type BroadcastStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'PARTIAL'
  | 'FAILED';

/** A single SMS broadcast record (INTEGRATION API: SMS BROADCASTS). */
export interface Broadcast {
  id: string;
  title?: string | null;
  text: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  /** Total recipients targeted (may be absent until the queue resolves). */
  recipientCount?: number | null;
  /** Successfully delivered count (populated as the queue drains). */
  sentCount?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type BroadcastListParams = PaginationParams;

/** Payload for POST /broadcasts. */
export interface CreateBroadcastDto {
  title?: string;
  text: string;
  audience: BroadcastAudience;
}
