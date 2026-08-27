import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealtimeNamespace } from './useRealtimeNamespace';

/** Server payload from the '/realtime' gateway (see backend RealtimeGateway). */
interface EntityChangeEvent {
  resource: string;
  action: 'created' | 'updated' | 'deleted';
  id?: string;
  at: string;
}

/**
 * Prisma model name → TanStack Query key prefixes to invalidate.
 *
 * A change to one model often touches several views (a Payment moves the
 * payments list, the student-payments history, the debts report and the
 * finance analytics), so several models fan out to multiple scopes. Rename
 * ripples are covered too: e.g. a Course rename refreshes student rows that
 * display the course name. Only genuinely unmappable models are ignored:
 * RefreshToken (no UI) and Notification (no notification UI on the frontend).
 * Conversation/Message ALSO invalidate here — the dedicated '/chats' socket
 * gives the open inbox richer in-place updates, while this signal keeps any
 * cached conversation lists fresh for a manager who is elsewhere in the app.
 * Invalidation only refetches ACTIVE (mounted) queries, so the fan-out stays
 * cheap.
 */
const RESOURCE_QUERY_KEYS: Record<string, ReadonlyArray<ReadonlyArray<string>>> = {
  Branch: [['branches']],
  Room: [['rooms'], ['lessons']],
  CourseType: [['course-types'], ['courses']],
  Course: [['courses'], ['groups'], ['students']],
  Student: [['students'], ['groups'], ['payments'], ['student-payments'], ['me']],
  Parent: [['students']],
  Teacher: [['teachers'], ['groups'], ['lessons'], ['salaries'], ['staff'], ['me']],
  Employee: [['staff'], ['salaries']],
  User: [['staff'], ['telegram'], ['me']],
  Group: [['groups'], ['lessons'], ['lesson-rates'], ['students']],
  GroupStudent: [['groups'], ['students'], ['payments'], ['me']],
  Lesson: [['lessons'], ['journal'], ['salaries'], ['analytics'], ['me']],
  LessonRate: [['lesson-rates'], ['salaries'], ['lessons']],
  Grade: [['journal'], ['me']],
  Attendance: [['journal'], ['me']],
  Remark: [['remarks'], ['journal'], ['me']],
  Payment: [['payments'], ['student-payments'], ['analytics'], ['students']],
  FinanceRecord: [['finance-records'], ['analytics']],
  Salary: [['salaries']],
  Broadcast: [['broadcasts']],
  SystemSetting: [['system-settings']],
  Conversation: [['conversations']],
  Message: [['conversations']],
};

const FLUSH_DELAY_MS = 120;

/**
 * Subscribe the app to the global realtime bus and keep every open page fresh.
 *
 * On each `entity:changed` signal we invalidate the mapped query keys — active
 * (mounted) queries refetch through their normal RBAC-guarded REST endpoint, so
 * a user only ever sees data they're allowed to. Invalidations are coalesced
 * over a short window so a burst of writes (e.g. bulk generate) triggers at most
 * one refetch per affected scope. Mount once, high in the authenticated shell.
 */
export function useRealtimeSync(enabled = true): void {
  const qc = useQueryClient();
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useRealtimeNamespace(
    '/realtime',
    {
      'entity:changed': (...args: unknown[]) => {
        const evt = args[0] as EntityChangeEvent | undefined;
        if (!evt?.resource || !RESOURCE_QUERY_KEYS[evt.resource]) return;

        pending.current.add(evt.resource);
        if (timer.current) return;
        timer.current = setTimeout(() => {
          const resources = Array.from(pending.current);
          pending.current.clear();
          timer.current = null;
          const seen = new Set<string>();
          for (const resource of resources) {
            for (const key of RESOURCE_QUERY_KEYS[resource] ?? []) {
              const tag = key.join('/');
              if (seen.has(tag)) continue;
              seen.add(tag);
              void qc.invalidateQueries({ queryKey: key as unknown as string[] });
            }
          }
        }, FLUSH_DELAY_MS);
      },
    },
    enabled,
  );
}
