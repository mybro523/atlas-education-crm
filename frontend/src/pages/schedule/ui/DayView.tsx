import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Trash2, Undo2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { isOptimisticId } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { Lesson } from '@/entities/lesson';
import {
  isSameDay,
  toDateInput,
  type LessonView,
} from '@/features/schedule-editor';
import { lessonRoomColor, roomAccentStyle } from './roomAccent';

export interface DayViewProps {
  day: Date;
  /** Lessons of the day, already sorted by start time. */
  lessons: Lesson[];
  resolve: (lesson: Lesson) => LessonView;
  canCrud: boolean;
  canManageLesson: (lesson: Lesson) => boolean;
  onAddForDay: (date: Date) => void;
  onEditLesson: (lesson: Lesson) => void;
  onConductLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}

/** Pixel height of one hour row. */
const HOUR_HEIGHT = 48;
const DAY_HEIGHT = 24 * HOUR_HEIGHT;
/** Left gutter reserved for the hour labels. */
const GUTTER = 52;
/** Breathing room to the right of the lesson area. */
const RIGHT_PAD = 8;
/** A card never renders shorter than this (≈50 min at 48px/h). */
const MIN_CARD_HEIGHT = 40;
const MIN_LAYOUT_MINUTES = Math.round((MIN_CARD_HEIGHT / HOUR_HEIGHT) * 60);
/** Scroll so ~07:00 is at the top of the viewport initially. */
const INITIAL_SCROLL_HOUR = 7;

const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface TimelineItem {
  lesson: Lesson;
  view: LessonView;
  top: number;
  height: number;
  /** Column index / total columns inside an overlap cluster. */
  col: number;
  cols: number;
}

/**
 * Lay lessons out on the 24h axis. Overlapping lessons are grouped into
 * clusters and split side-by-side into greedy columns; the visual minimum
 * card height also counts as occupied time so short lessons don't stack.
 */
function layoutTimeline(
  lessons: Lesson[],
  day: Date,
  resolve: (lesson: Lesson) => LessonView,
): TimelineItem[] {
  const startOfDay = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
  ).getTime();

  const slots = [...lessons]
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .map((lesson) => {
      const startMin = Math.round(
        (new Date(lesson.startsAt).getTime() - startOfDay) / 60_000,
      );
      const start = Math.min(Math.max(startMin, 0), 24 * 60 - 5);
      let end = lesson.endsAt
        ? Math.round((new Date(lesson.endsAt).getTime() - startOfDay) / 60_000)
        : start + 60;
      // Clamp to the visible day; guard inverted/zero-length ranges.
      end = Math.min(Math.max(end, start + 30), 24 * 60);
      return { lesson, start, end, layoutEnd: Math.max(end, start + MIN_LAYOUT_MINUTES), col: 0 };
    });

  const items: TimelineItem[] = [];
  let cluster: typeof slots = [];
  let colEnds: number[] = [];
  let clusterMaxEnd = -1;

  const flush = () => {
    const cols = Math.max(colEnds.length, 1);
    for (const s of cluster) {
      const height = Math.max(
        ((s.end - s.start) / 60) * HOUR_HEIGHT,
        MIN_CARD_HEIGHT,
      );
      items.push({
        lesson: s.lesson,
        view: resolve(s.lesson),
        top: Math.min((s.start / 60) * HOUR_HEIGHT, DAY_HEIGHT - height),
        height,
        col: s.col,
        cols,
      });
    }
    cluster = [];
    colEnds = [];
    clusterMaxEnd = -1;
  };

  for (const slot of slots) {
    if (cluster.length > 0 && slot.start >= clusterMaxEnd) flush();
    let col = colEnds.findIndex((endsAt) => endsAt <= slot.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(0);
    }
    colEnds[col] = slot.layoutEnd;
    slot.col = col;
    cluster.push(slot);
    clusterMaxEnd = Math.max(clusterMaxEnd, slot.layoutEnd);
  }
  flush();

  return items;
}

/** Single-day 24-hour timeline. Flawless from 320px; scrolls vertically. */
export function DayView({
  day,
  lessons,
  resolve,
  canCrud,
  canManageLesson,
  onAddForDay,
  onEditLesson,
  onConductLesson,
  onDeleteLesson,
}: DayViewProps) {
  const { t } = useTranslation();
  const now = new Date();
  const isToday = isSameDay(day, now);
  const nowTop = isToday
    ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
    : null;

  const items = useMemo(
    () => layoutTimeline(lessons, day, resolve),
    [lessons, day, resolve],
  );

  // Auto-scroll the timeline so the working morning is visible on open.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dayKey = toDateInput(day);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = INITIAL_SCROLL_HOUR * HOUR_HEIGHT - 8;
  }, [dayKey]);

  return (
    <div
      className={cn(
        'mx-auto max-w-2xl rounded-2xl border bg-surface p-3 sm:p-4',
        isToday ? 'border-primary/40' : 'border-border',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2
            className={cn(
              'truncate text-sm font-semibold sm:text-base',
              isToday ? 'text-primary' : 'text-foreground',
            )}
          >
            {day.toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          <p className="text-xs text-foreground-muted">
            {lessons.length === 0
              ? t('schedule.emptyDay')
              : t('schedule.hourFormat')}
          </p>
        </div>
        {canCrud && (
          <Button type="button" size="sm" onClick={() => onAddForDay(day)}>
            <Plus className="h-4 w-4" />
            {t('schedule.create')}
          </Button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="relative h-[70vh] max-h-[36rem] min-h-[18rem] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface"
        aria-label={t('schedule.allDay')}
      >
        <div className="relative" style={{ height: DAY_HEIGHT }}>
          {/* Hour rows: subtle lines + labels in the left gutter */}
          {HOURS.map((h) => (
            <div
              key={h}
              className="pointer-events-none absolute inset-x-0"
              style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              {h > 0 && (
                <div className="absolute inset-x-0 top-0 border-t border-border/60" />
              )}
              <span className="absolute left-2 top-1 text-[10px] font-medium tabular-nums text-foreground-muted">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-y-0 border-l border-border/60"
            style={{ left: GUTTER - 6 }}
          />

          {/* Lessons, absolutely positioned by start/end time */}
          {items.map(({ lesson, view, top, height, col, cols }) => {
            const isPending = isOptimisticId(lesson.id);
            const canManage = canManageLesson(lesson);
            const clickable = canManage && !isPending;
            const roomColor = lessonRoomColor(lesson);
            const area = `(100% - ${GUTTER + RIGHT_PAD}px)`;
            const metaParts = [
              view.teacherName,
              view.roomName ?? t('schedule.fields.noRoom'),
            ].filter(Boolean);

            return (
              <div
                key={lesson.id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onEditLesson(lesson) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEditLesson(lesson);
                        }
                      }
                    : undefined
                }
                title={`${view.timeLabel} · ${view.courseName}`}
                className={cn(
                  'absolute overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm',
                  roomColor && 'border-l-4',
                  lesson.isConducted
                    ? 'border-success/40 bg-success/10'
                    : 'border-border bg-surface-muted/60',
                  clickable &&
                    'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                style={{
                  top,
                  height,
                  left: `calc(${GUTTER}px + ${area} * ${col / cols})`,
                  width: `calc(${area} / ${cols} - 4px)`,
                  ...roomAccentStyle(roomColor),
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        lesson.isConducted
                          ? 'bg-success'
                          : 'bg-foreground-muted/40',
                      )}
                    />
                    <span className="truncate text-[11px] font-medium tabular-nums text-foreground">
                      {view.timeLabel}
                    </span>
                  </span>
                  {(canManage || canCrud) && (
                    <span className="flex shrink-0 items-center gap-0.5">
                      {canManage && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            onConductLesson(lesson);
                          }}
                          aria-label={
                            lesson.isConducted
                              ? t('schedule.markNotConducted')
                              : t('schedule.markConducted')
                          }
                          title={
                            lesson.isConducted
                              ? t('schedule.markNotConducted')
                              : t('schedule.markConducted')
                          }
                          className={cn(
                            'rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            lesson.isConducted
                              ? 'text-foreground-muted hover:bg-surface-muted'
                              : 'text-success hover:bg-success/10',
                          )}
                        >
                          {lesson.isConducted ? (
                            <Undo2 className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {canCrud && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLesson(lesson);
                          }}
                          aria-label={t('common.delete')}
                          title={t('common.delete')}
                          className="rounded p-0.5 text-foreground-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs font-semibold text-foreground">
                  {view.courseName}
                  {view.groupName ? ` · ${view.groupName}` : ''}
                </p>
                {metaParts.length > 0 && (
                  <p className="truncate text-[11px] text-foreground-muted">
                    {metaParts.join(' · ')}
                  </p>
                )}
              </div>
            );
          })}

          {/* Current-time indicator (today only) */}
          {nowTop !== null && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: nowTop }}
            >
              <div className="border-t-2 border-primary/70" />
              <div
                className="absolute -top-[3px] h-1.5 w-1.5 rounded-full bg-primary"
                style={{ left: GUTTER - 9 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
