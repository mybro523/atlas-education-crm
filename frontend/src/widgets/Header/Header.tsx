import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useOnClickOutside } from '@/shared/lib/hooks';
import { ROUTES, roleLabelKey } from '@/shared/config';
import { ThemeToggleButton } from '@/features/theme-toggle';
import { LanguageSwitchButton } from '@/features/language-switch';
import { useLogout } from '@/features/auth-logout';
import { useSessionStore, selectUser } from '@/entities/session';

export interface HeaderProps {
  /** Opens the mobile sidebar drawer. */
  onOpenSidebar: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore(selectUser);
  const { logout } = useLogout();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-5">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label={t('header.openMenu')}
        className="rounded-lg p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile logo (desktop shows it in the sidebar) */}
      <div className="flex items-center gap-2 lg:hidden">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <LanguageSwitchButton />
        <ThemeToggleButton />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('header.userMenu')}
            className={cn(
              'flex items-center gap-2 rounded-lg p-1 pl-1 pr-1 sm:pr-2',
              'transition-colors hover:bg-surface-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user ? initials(user.fullName) : <UserIcon className="h-4 w-4" />}
            </span>
            <span className="hidden max-w-[10rem] flex-col items-start leading-tight sm:flex">
              <span className="truncate text-sm font-medium text-foreground">
                {user?.fullName ?? '—'}
              </span>
              {user && (
                <span className="truncate text-xs text-foreground-muted">
                  {t(roleLabelKey(user.role))}
                </span>
              )}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-elevated animate-fade-in"
            >
              {user && (
                <div className="border-b border-border px-3 py-2.5 sm:hidden">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs text-foreground-muted">
                    {t(roleLabelKey(user.role))}
                  </p>
                </div>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-danger transition-colors hover:bg-surface-muted"
              >
                <LogOut className="h-4 w-4" />
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
