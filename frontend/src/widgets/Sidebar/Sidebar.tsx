import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { APP_NAME, navItemsForRole } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';

export interface SidebarProps {
  /** Mobile drawer open state (ignored on desktop). */
  open: boolean;
  onClose: () => void;
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2.5 px-5">
      <img src="/logo.svg" alt="" className="h-8 w-8" />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        {APP_NAME}
      </span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const role = useSessionStore(selectRole);
  const items = navItemsForRole(role);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {items.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Role-aware navigation. On lg+ it is a persistent rail; below lg it becomes
 * an off-canvas drawer with a backdrop.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();

  // Close the drawer on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        <Brand />
        <NavList />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-surface shadow-elevated animate-slide-in">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={onClose}
                aria-label={t('header.closeMenu')}
                className="mr-3 rounded-lg p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
