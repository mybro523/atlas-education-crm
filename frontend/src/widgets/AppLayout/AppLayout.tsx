import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { Header } from '@/widgets/Header';
import { SubscriptionBanner } from '@/widgets/SubscriptionBanner';
import { useRealtimeSync } from '@/shared/lib/realtime';
import { Spinner } from '@/shared/ui';

/**
 * Protected dashboard shell: role-based Sidebar + Header + routed content.
 * Manages the mobile drawer open state shared by Header (trigger) and Sidebar.
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Global realtime: any change made by anyone refreshes the open page live.
  useRealtimeSync();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <SubscriptionBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            {/* Keep the shell (sidebar/header) painted while a lazy page chunk
                loads; only the content area shows the fallback spinner. */}
            <Suspense
              fallback={
                <div className="flex justify-center py-20">
                  <Spinner />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
