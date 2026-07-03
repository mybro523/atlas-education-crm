import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

export interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** How many numbered buttons to show around the current page. */
  siblingCount?: number;
  className?: string;
}

const DOTS = 'dots';

/** Build the list of pages/ellipses to render. */
function usePageRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): Array<number | typeof DOTS> {
  return useMemo(() => {
    // First page, last page, current +- siblings, and 1 for each ellipsis slot.
    const totalNumbers = siblingCount * 2 + 5;
    if (pageCount <= totalNumbers) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const left = Math.max(page - siblingCount, 1);
    const right = Math.min(page + siblingCount, pageCount);
    const showLeftDots = left > 2;
    const showRightDots = right < pageCount - 1;

    const range: Array<number | typeof DOTS> = [1];
    if (showLeftDots) range.push(DOTS);
    for (let i = showLeftDots ? left : 2; i <= (showRightDots ? right : pageCount - 1); i++) {
      range.push(i);
    }
    if (showRightDots) range.push(DOTS);
    range.push(pageCount);
    return range;
  }, [page, pageCount, siblingCount]);
}

/**
 * Numbered pagination. Collapses to compact prev/next + "page X of N" on the
 * smallest screens; shows numbered buttons from sm+. Fully themed.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const range = usePageRange(page, pageCount, siblingCount);

  if (pageCount <= 1) return null;

  const go = (p: number) => {
    const clamped = Math.min(Math.max(p, 1), pageCount);
    if (clamped !== page) onPageChange(clamped);
  };

  const navBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border ' +
    'bg-surface px-2 text-sm text-foreground transition-colors ' +
    'hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <nav
      className={cn('flex items-center justify-center gap-1.5', className)}
      role="navigation"
      aria-label={t('pagination.label')}
    >
      <button
        type="button"
        className={navBtn}
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={t('pagination.previous')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Compact indicator on mobile. */}
      <span className="px-2 text-sm text-foreground-muted sm:hidden">
        {t('pagination.pageOf', { page, pageCount })}
      </span>

      {/* Numbered buttons on sm+. */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {range.map((item, idx) =>
          item === DOTS ? (
            <span
              key={`dots-${idx}`}
              className="px-1 text-sm text-foreground-muted"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                navBtn,
                item === page &&
                  'border-primary bg-primary text-primary-foreground hover:bg-primary-hover',
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className={navBtn}
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        aria-label={t('pagination.next')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
