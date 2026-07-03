import { useThemeStore, type ThemeMode } from '@/shared/lib/theme';

/** Ergonomic hook exposing the current theme + toggle for feature consumers. */
export function useTheme(): {
  theme: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setTheme: (mode: ThemeMode) => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return { theme, isDark: theme === 'dark', toggle, setTheme };
}
