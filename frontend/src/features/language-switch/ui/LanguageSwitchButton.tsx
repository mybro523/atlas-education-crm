import {
  LanguageSwitcher,
  type LanguageSwitcherProps,
} from '@/shared/ui';

/**
 * Feature-level language switcher wrapper over the shared presentational one,
 * so widgets depend on the feature public API.
 */
export function LanguageSwitchButton(props: LanguageSwitcherProps) {
  return <LanguageSwitcher {...props} />;
}
