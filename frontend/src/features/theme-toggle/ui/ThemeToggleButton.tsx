import { ThemeToggle, type ThemeToggleProps } from '@/shared/ui';

/**
 * Feature-level theme toggle. Re-exports the shared presentational toggle so
 * widgets depend on the feature, not directly on shared/ui internals.
 */
export function ThemeToggleButton(props: ThemeToggleProps) {
  return <ThemeToggle {...props} />;
}
