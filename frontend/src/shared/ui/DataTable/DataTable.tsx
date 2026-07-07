import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../EmptyState';

export interface DataTableColumn<T> {
  /** Stable id (also used as React key + mobile card label fallback). */
  id: string;
  /** Column header (localized string or node). */
  header: ReactNode;
  /** Cell renderer. Receives the row and its index. */
  cell: (row: T, index: number) => ReactNode;
  /**
   * Sort accessor — providing it makes the header clickable. Return a string
   * (alphabetical, locale-aware), a number, or an ISO date string / timestamp
   * for chronological ordering. Null/undefined rows sort last.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Extra classes for both header + cell (e.g. text-right, hidden md:table-cell). */
  className?: string;
  /** Header-only classes. */
  headerClassName?: string;
  /** Hide this column from the mobile stacked-card view. */
  hideOnMobile?: boolean;
  /** Label used for this field in the mobile card view (defaults to `header`). */
  mobileLabel?: ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  /** Stable row key extractor. */
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  /** Rows to render as skeletons while loading. */
  skeletonRows?: number;
  /** Row click handler (makes rows interactive/hoverable). */
  onRowClick?: (row: T) => void;
  /** Localized empty-state title. Defaults to a generic i18n string. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  className?: string;
}

type SortDir = 'asc' | 'desc';

interface SortState {
  colId: string;
  dir: SortDir;
}

/** Locale-aware comparator over a column's sortValue; nullish values sort last. */
function compareRows<T>(
  a: T,
  b: T,
  accessor: (row: T) => string | number | null | undefined,
  dir: SortDir,
): number {
  const va = accessor(a);
  const vb = accessor(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1; // nulls always last regardless of direction
  if (vb == null) return -1;
  let cmp: number;
  if (typeof va === 'number' && typeof vb === 'number') {
    cmp = va - vb;
  } else {
    cmp = String(va).localeCompare(String(vb), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }
  return dir === 'asc' ? cmp : -cmp;
}

/**
 * Generic, responsive data table.
 * - Desktop (>=640px): real <table> with sticky-friendly header.
 * - Mobile (<640px): each row becomes a stacked card (label/value pairs).
 * - Columns with `sortValue` get clickable headers (asc → desc → off),
 *   sorting the CURRENT page client-side (alphabetical / numeric / by date).
 * - Built-in loading skeleton + empty state. Fully themed (light + dark).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortState | null>(null);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  const sortedData = useMemo(() => {
    if (!data || !sort) return data;
    const col = columns.find((c) => c.id === sort.colId);
    if (!col?.sortValue) return data;
    const accessor = col.sortValue;
    return [...data].sort((a, b) => compareRows(a, b, accessor, sort.dir));
  }, [data, sort, columns]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    setSort((prev) => {
      if (!prev || prev.colId !== col.id) return { colId: col.id, dir: 'asc' };
      if (prev.dir === 'asc') return { colId: col.id, dir: 'desc' };
      return null; // third click resets to the server order
    });
  };

  const headerContent = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return col.header;
    const active = sort?.colId === col.id;
    const Icon = !active ? ArrowUpDown : sort!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide',
          'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
          active ? 'text-foreground' : 'text-foreground-muted',
        )}
        aria-label={t('table.sortBy')}
      >
        {col.header}
        <Icon className={cn('h-3.5 w-3.5', !active && 'opacity-50')} aria-hidden />
      </button>
    );
  };

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        {/* Desktop skeleton */}
        <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted',
                      col.headerClassName,
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, r) => (
                <tr key={r} className="border-b border-border last:border-0">
                  {columns.map((col) => (
                    <td key={col.id} className={cn('px-4 py-3.5', col.className)}>
                      <Skeleton variant="text" className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile skeleton */}
        <div className="space-y-3 sm:hidden">
          {Array.from({ length: skeletonRows }).map((_, r) => (
            <div
              key={r}
              className="space-y-2 rounded-xl border border-border bg-surface p-4"
            >
              {mobileColumns.map((col) => (
                <Skeleton key={col.id} variant="text" className="h-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- Empty ---------------- */
  if (!sortedData || sortedData.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-surface',
          className,
        )}
      >
        <EmptyState
          title={emptyTitle ?? t('table.empty')}
          description={emptyDescription}
          icon={emptyIcon}
        />
      </div>
    );
  }

  /* ---------------- Data ---------------- */
  const interactive = !!onRowClick;

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={
                    sort?.colId === col.id
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted',
                    col.headerClassName,
                    col.className,
                  )}
                >
                  {headerContent(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={interactive ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border bg-surface transition-colors last:border-0',
                  interactive &&
                    'cursor-pointer hover:bg-surface-muted focus-within:bg-surface-muted',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-4 py-3.5 text-foreground align-middle',
                      col.className,
                    )}
                  >
                    {col.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-3 sm:hidden">
        {sortedData.map((row, index) => (
          <div
            key={rowKey(row, index)}
            onClick={interactive ? () => onRowClick(row) : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            className={cn(
              'rounded-xl border border-border bg-surface p-4',
              interactive &&
                'cursor-pointer transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <dl className="space-y-2">
              {mobileColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-start justify-between gap-3"
                >
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    {col.mobileLabel ?? col.header}
                  </dt>
                  <dd className="min-w-0 text-right text-sm text-foreground">
                    {col.cell(row, index)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
