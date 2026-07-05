import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { Header } from '@/widgets/Header';

/**
 * Protected dashboard shell: role-based Sidebar + Header + routed content.
 * Manages the mobile drawer open state shared by Header (trigger) and Sidebar.
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
