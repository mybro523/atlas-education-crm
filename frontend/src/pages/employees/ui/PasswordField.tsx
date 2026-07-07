import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Dices } from 'lucide-react';
import { Input } from '@/shared/ui';

/**
 * Unambiguous password alphabet (no 0/O, 1/l/I) so a founder can read the
 * generated password aloud or retype it without confusion.
 */
const PASSWORD_CHARSET =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Cryptographically-random readable password (default 8 chars). */
function generatePassword(length = 8): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => PASSWORD_CHARSET[b % PASSWORD_CHARSET.length],
  ).join('');
}

export interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
}

/**
 * Password input with an eye (show/hide) toggle and a dice button that fills
 * a random 8-char password. Generating reveals the value so the founder can
 * read it before handing it to the employee.
 */
export function PasswordField({
  value,
  onChange,
  error,
  label,
  autoFocus,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const generate = () => {
    onChange(generatePassword(8));
    setShow(true);
  };

  const iconButton =
    'flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted ' +
    'transition-colors hover:text-foreground focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Input
      type={show ? 'text' : 'password'}
      label={label ?? t('fields.password')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      autoComplete="new-password"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={72}
      autoFocus={autoFocus}
      className="pr-[4.75rem]"
      rightIcon={
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={generate}
            aria-label={t('employees.resetTitle')}
            title={t('employees.resetTitle')}
            className={iconButton}
          >
            <Dices className="h-4 w-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
            title={show ? t('auth.hidePassword') : t('auth.showPassword')}
            className={iconButton}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      }
    />
  );
}
