import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useOnClickOutside } from '@/shared/lib/hooks';
import { LANGUAGES, type Language } from '@/shared/config';

const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'Русский',
  tj: 'Тоҷикӣ',
  en: 'English',
};

const LANGUAGE_SHORT: Record<Language, string> = {
  ru: 'RU',
  tj: 'TJ',
  en: 'EN',
};

export interface LanguageSwitcherProps {
  className?: string;
}

/** Dropdown to switch the interface language (ru / tj / en). */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef, () => setOpen(false), open);

  const current = (
    LANGUAGES.includes(i18n.resolvedLanguage as Language)
      ? i18n.resolvedLanguage
      : 'ru'
  ) as Language;

  const changeLanguage = (lng: Language) => {
    void i18n.changeLanguage(lng);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5',
          'text-sm font-medium text-foreground-muted transition-colors',
          'hover:bg-surface-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline">{LANGUAGE_SHORT[current]}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-elevated animate-fade-in"
        >
          {LANGUAGES.map((lng) => (
            <button
              key={lng}
              role="menuitemradio"
              aria-checked={lng === current}
              onClick={() => changeLanguage(lng)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                'transition-colors hover:bg-surface-muted',
                lng === current
                  ? 'font-medium text-primary'
                  : 'text-foreground',
              )}
            >
              {LANGUAGE_LABELS[lng]}
              {lng === current && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
