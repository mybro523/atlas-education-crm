import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '@/shared/lib/theme';

/**
 * Applies the current theme to <html class="dark"> and, while the user has
 * not made an explicit choice, keeps it in sync with the OS preference.
 * Persistence is handled inside the theme store (localStorage).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const isSystem = useThemeStore((s) => s.isSystem);

  // Reflect the resolved theme on the root element.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  // Follow system changes only until the user explicitly overrides.
  useEffect(() => {
    if (!isSystem || !('matchMedia' in window)) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      // While isSystem is true we mirror the OS; an explicit setTheme() call
      // elsewhere flips isSystem to false, so this effect re-runs and detaches.
      useThemeStore.setState({ theme: e.matches ? 'dark' : 'light' });
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [isSystem]);

  return <>{children}</>;
}
