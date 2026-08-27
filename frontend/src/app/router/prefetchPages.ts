/**
 * Warm every lazy page chunk during browser idle time, right after the shell
 * has painted. The initial load stays light (only the login/shell code is in
 * the entry bundle), but by the time the user clicks a nav item its chunk is
 * already fetched and cached — so navigation feels instant, with no spinner.
 *
 * Each specifier here MUST match a `import('@/pages/...')` in AppRouter so Vite
 * resolves them to the same chunk (the prefetch and the lazy() share it).
 */
const PAGE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('@/pages/dashboard'),
  () => import('@/pages/students'),
  () => import('@/pages/teachers'),
  () => import('@/pages/groups'),
  () => import('@/pages/courses'),
  () => import('@/pages/branches'),
  () => import('@/pages/rooms'),
  () => import('@/pages/course-types'),
  () => import('@/pages/schedule'),
  () => import('@/pages/journal'),
  () => import('@/pages/finance'),
  () => import('@/pages/student-payments'),
  () => import('@/pages/employees'),
  () => import('@/pages/salaries'),
  () => import('@/pages/student-cabinet'),
  () => import('@/pages/teacher-cabinet'),
  () => import('@/pages/chats'),
  () => import('@/pages/broadcast'),
  () => import('@/pages/settings'),
  () => import('@/pages/owner'),
];

let started = false;

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };

/** Kick off idle prefetching once per session. Safe to call on every mount. */
export function prefetchPages(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  const run = () => {
    for (const load of PAGE_LOADERS) {
      void load().catch(() => {
        /* a prefetch miss is non-fatal — the lazy route will just load on demand */
      });
    }
  };

  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}
