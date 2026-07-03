import { create } from 'zustand';
import { STORAGE_KEYS } from '@/shared/config';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  /** true when the user has never explicitly chosen — follow system pref. */
  isSystem: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Resolve the initial theme: stored choice wins, else system preference. */
function initialTheme(): { theme: ThemeMode; isSystem: boolean } {
  if (typeof window === 'undefined') return { theme: 'light', isSystem: true };
  const stored = window.localStorage.getItem(STORAGE_KEYS.theme);
  if (stored === 'light' || stored === 'dark') {
    return { theme: stored, isSystem: false };
  }
  return { theme: prefersDark() ? 'dark' : 'light', isSystem: true };
}

const init = initialTheme();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: init.theme,
  isSystem: init.isSystem,
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
    set({ theme, isSystem: false });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

export { prefersDark };
