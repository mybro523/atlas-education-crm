import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Shared pagination query DTO. Reuse across every list endpoint.
 *
 * Defaults: page=1, pageSize=20. pageSize is capped at 100 to protect the DB.
 * `@Type(() => Number)` is required because query params arrive as strings and
 * the global ValidationPipe runs with `transform: true`.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

/**
 * Standard envelope returned by every paginated list endpoint.
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
}

/**
 * Convert a PaginationQueryDto into Prisma `skip` / `take` values.
 */
export function toSkipTake(query: {
  page?: number;
  pageSize?: number;
}): { skip: number; take: number; page: number; pageSize: number } {
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize =
    query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

/**
 * Build the standard PaginatedResult envelope.
 *
 * @param items   The page of rows already fetched from the DB.
 * @param total   Total number of matching rows (across all pages).
 * @param page    Current 1-based page.
 * @param pageSize Page size actually used.
 */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    },
  };
}
