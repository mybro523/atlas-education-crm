import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';

import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  InlineError,
  Input,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from '@/entities/system-settings';

/* ------------------------------------------------------------------ *
 * Field metadata
 * ------------------------------------------------------------------ */

/** Numeric settings shown by the card, with their allowed integer ranges. */
const NUMERIC_FIELDS = [
  {
    key: 'paymentDueDays',
    min: 0,
    max: 31,
    hintKey: 'settingsPage.paymentDueDaysHint',
  },
  {
    key: 'absenceSmsThreshold',
    min: 1,
    max: 10,
    hintKey: 'settingsPage.absenceSmsThresholdHint',
  },
  { key: 'defaultLessonDurationMin', min: 15, max: 480, hintKey: null },
  { key: 'passwordMinLength', min: 4, max: 32, hintKey: null },
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];
type NumericKey = NumericField['key'];

/** Local (editable) form state — numbers kept as strings while typing. */
type FormState = Record<NumericKey, string> & { adminCanSeeFinance: boolean };

/** Strict integer parse: "12" → 12, ""/"1.5"/"abc" → null. */
function parseIntStrict(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Range violation → inline error text ("0–31"); valid → undefined. */
function rangeError(value: string, field: NumericField): string | undefined {
  const n = parseIntStrict(value);
  if (n === null || n < field.min || n > field.max) {
    return `${field.min}–${field.max}`;
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

/**
 * "Настройки системы" — flexible runtime parameters (payment-due window,
 * absence SMS threshold, default lesson duration, min password length,
 * admin finance visibility). FOUNDER-only: the page renders this card only
 * for the FOUNDER role. Values load from GET /settings and save via
 * PUT /settings (optimistic merge + server reconcile).
 */
export function SystemSettingsCard() {
  const { t } = useTranslation();
  const toast = useToast();

  const settingsQuery = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  // Local draft, initialized (and re-synced) from the query once data arrives.
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setForm({
      paymentDueDays: data.paymentDueDays ?? '',
      absenceSmsThreshold: data.absenceSmsThreshold ?? '',
      defaultLessonDurationMin: data.defaultLessonDurationMin ?? '',
      passwordMinLength: data.passwordMinLength ?? '',
      adminCanSeeFinance: data.adminCanSeeFinance === 'true',
    });
  }, [settingsQuery.data]);

  const setNumber = (key: NumericKey, value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const hasErrors =
    !form || NUMERIC_FIELDS.some((f) => rangeError(form[f.key], f) !== undefined);

  const save = () => {
    if (!form || hasErrors) return;

    const entries: Record<string, string> = {
      adminCanSeeFinance: form.adminCanSeeFinance ? 'true' : 'false',
    };
    for (const f of NUMERIC_FIELDS) {
      // Validated above — parse is non-null and in range; normalize "07" → "7".
      entries[f.key] = String(parseIntStrict(form[f.key]));
    }

    updateSettings.mutate(entries, {
      onSuccess: () => toast.success(t('settingsPage.saved')),
      onError: () => toast.error(t('form.saveError')),
    });
  };

  return (
    <Card>
      <CardHeader className="mb-4 flex flex-row items-start gap-3 space-y-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300"
          aria-hidden
        >
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>{t('settingsPage.systemTitle')}</CardTitle>
          <CardDescription>{t('settingsPage.systemHint')}</CardDescription>
        </div>
      </CardHeader>

      {settingsQuery.isError ? (
        <InlineError message={t('form.loadError')} />
      ) : !form ? (
        <SettingsSkeleton />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {NUMERIC_FIELDS.map((field) => {
              const error = rangeError(form[field.key], field);
              return (
                <div key={field.key}>
                  <Input
                    label={t(`settingsPage.${field.key}`)}
                    type="number"
                    inputMode="numeric"
                    min={field.min}
                    max={field.max}
                    step={1}
                    value={form[field.key]}
                    onChange={(e) => setNumber(field.key, e.target.value)}
                    error={error}
                  />
                  {!error && (
                    <p className="mt-1.5 text-xs text-foreground-muted">
                      {field.hintKey
                        ? t(field.hintKey)
                        : `${field.min}–${field.max}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              checked={form.adminCanSeeFinance}
              onChange={(e) =>
                setForm((prev) =>
                  prev
                    ? { ...prev, adminCanSeeFinance: e.target.checked }
                    : prev,
                )
              }
            />
            {t('settingsPage.adminCanSeeFinance')}
          </label>

          <Button
            type="submit"
            disabled={hasErrors}
            loading={updateSettings.isPending}
          >
            {t('settingsPage.save')}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** Loading placeholder mirroring the form layout (2-col grid + button). */
function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NUMERIC_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Skeleton className="h-4 w-2/3" variant="text" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-5 w-48" variant="text" />
      <Skeleton className="h-10 w-44" />
    </div>
  );
}
