import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DoorOpen, Clock } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Badge, Input, Spinner } from '@/shared/ui';
import {
  useRoomOccupancy,
  type RoomOccupancyItem,
  type RoomOccupancyParams,
} from '@/entities/lesson';
import { buildDay, combineToIso, toDateInput } from '@/features/schedule-editor';

export interface RoomOccupancyPanelProps {
  /** Day the schedule is focused on; seeds the occupancy date. */
  initialDate: Date;
}

/**
 * Room free/occupied view for a chosen day (optionally narrowed to a time
 * window), backed by GET /schedule/rooms/occupancy. Sends a precise local
 * `from`/`to` window so the result matches the times shown elsewhere.
 */
export function RoomOccupancyPanel({ initialDate }: RoomOccupancyPanelProps) {
  const { t } = useTranslation();

  const [dateStr, setDateStr] = useState(() => toDateInput(initialDate));
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');

  // Follow the schedule's focused day when it changes.
  useEffect(() => {
    setDateStr(toDateInput(initialDate));
  }, [initialDate]);

  const params = useMemo<RoomOccupancyParams | undefined>(() => {
    if (!dateStr) return undefined;
    const hasWindow = Boolean(startStr && endStr && endStr > startStr);
    if (hasWindow) {
      return {
        from: combineToIso(dateStr, startStr),
        to: combineToIso(dateStr, endStr),
      };
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const { fromIso, toIso } = buildDay(new Date(y, (m ?? 1) - 1, d ?? 1));
    return { from: fromIso, to: toIso };
  }, [dateStr, startStr, endStr]);

  const { data, isLoading, isError } = useRoomOccupancy(params);

  const items = data?.items ?? [];
  const freeCount = items.filter((i) => !i.occupied).length;
  const occupiedCount = items.length - freeCount;

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-foreground-muted" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">
            {t('schedule.occupancy.title')}
          </h2>
          {data && (
            <span className="text-xs text-foreground-muted">
              {t('schedule.occupancy.summary', {
                free: freeCount,
                occupied: occupiedCount,
                total: freeCount + occupiedCount,
              })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto">
          <div className="col-span-2 sm:col-span-1 sm:min-w-40">
            <Input
              type="date"
              aria-label={t('schedule.occupancy.date')}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>
          <Input
            type="time"
            aria-label={t('schedule.occupancy.start')}
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
          />
          <Input
            type="time"
            aria-label={t('schedule.occupancy.end')}
            value={endStr}
            onChange={(e) => setEndStr(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-foreground-muted">
            {t('form.loadError')}
          </p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-muted">
            {t('schedule.occupancy.noRooms')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <RoomOccupancyCard key={item.room.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomOccupancyCard({ item }: { item: RoomOccupancyItem }) {
  const { t } = useTranslation();
  const { room, occupied, lessons } = item;

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5',
        occupied
          ? 'border-danger/30 bg-danger/5'
          : 'border-success/30 bg-success/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {room.name}
        </span>
        <Badge variant={occupied ? 'danger' : 'success'} dot className="shrink-0">
          {occupied
            ? t('schedule.occupancy.occupied')
            : t('schedule.occupancy.free')}
        </Badge>
      </div>

      {occupied && lessons.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
          {lessons.map((lesson) => {
            const start = new Date(lesson.startsAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            const end = lesson.endsAt
              ? new Date(lesson.endsAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;
            return (
              <li
                key={lesson.id}
                className="flex items-start gap-1.5 text-xs text-foreground-muted"
              >
                <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium text-foreground">
                    {start}
                    {end ? `–${end}` : ''}
                  </span>{' '}
                  <span className="truncate">{lesson.group.course.name}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
