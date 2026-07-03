import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';

import {
  Card,
  Badge,
  Pagination,
  EmptyState,
  Skeleton,
} from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useBroadcasts, type Broadcast } from '@/entities/broadcast';
import { BroadcastStatusBadge } from './BroadcastStatusBadge';

const PAGE_SIZE = 10;

/** Locale-aware date + time (broadcasts are timestamped to the minute). */
function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function BroadcastRow({ item }: { item: Broadcast }) {
  const { t } = useTranslation();
  const isOptimistic = item.id.startsWith('optimistic-');

  const delivery =
    item.sentCount != null && item.recipientCount != null
      ? `${item.sentCount}/${item.recipientCount}`
      : (item.recipientCount ?? null);

  return (
    <li
      className={
        'flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-opacity' +
        (isOptimistic ? ' opacity-70' : '')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          {item.title && (
            <p className="truncate text-sm font-semibold text-foreground">
              {item.title}
            </p>
          )}
          <Badge variant="muted">
            {t(`broadcast.audience.${item.audience}`)}
          </Badge>
        </div>
        <BroadcastStatusBadge status={item.status} />
      </div>

      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {item.text}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
        <span>{formatDateTime(item.createdAt)}</span>
        {delivery != null && (
          <span>{t('broadcast.delivered', { value: delivery })}</span>
        )}
      </div>
    </li>
  );
}

/**
 * Paginated broadcast history (INTEGRATION API: GET /broadcasts). Each entry
 * shows title/audience/message with a color-coded delivery-status badge.
 */
export function BroadcastHistory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useBroadcasts({
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-foreground">
        {t('broadcast.historyTitle')}
      </h2>

      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="rounded-xl border border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton variant="text" className="mb-1.5 w-3/4" />
              <Skeleton variant="text" className="w-1/2" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" aria-hidden />}
          title={t('broadcast.loadError')}
          description={extractErrorMessage(error) ?? undefined}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" aria-hidden />}
          title={t('broadcast.empty')}
          description={t('broadcast.emptyHint')}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => (
              <BroadcastRow key={item.id} item={item} />
            ))}
          </ul>

          {total > 0 && (
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <p className="text-sm text-foreground-muted">
                {t('broadcast.count', { count: total })}
              </p>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
