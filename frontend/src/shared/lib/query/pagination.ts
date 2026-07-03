/**
 * Shared pagination contract (see API_CONTRACT §0.2).
 * Paginated list endpoints return `{ items, meta }`; dictionaries return `T[]`.
 */

/** Query params accepted by every paginated list endpoint. */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Envelope metadata returned by `buildPaginatedResult`. */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Paginated response envelope `{ items, meta }`. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
