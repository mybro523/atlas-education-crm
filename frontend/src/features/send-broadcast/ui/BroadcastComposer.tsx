import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Send, Users, GraduationCap, UsersRound } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Button,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { extractErrorMessage } from '@/shared/api';
import {
  useCreateBroadcast,
  type BroadcastAudience,
} from '@/entities/broadcast';

/**
 * Recommended max characters before an SMS splits into multiple segments.
 * Purely advisory for the counter — the backend enforces real limits.
 */
const SMS_SEGMENT_LEN = 160;
const MAX_LEN = 1000;

const AUDIENCES: readonly BroadcastAudience[] = [
  'ALL_STUDENTS',
  'ALL_TEACHERS',
  'BOTH',
];

const schema = z.object({
  title: z.string().max(120, { message: 'max' }).optional(),
  text: z
    .string()
    .trim()
    .min(1, { message: 'required' })
    .max(MAX_LEN, { message: 'max' }),
  audience: z.enum(['ALL_STUDENTS', 'ALL_TEACHERS', 'BOTH']),
});

type FormValues = z.infer<typeof schema>;

const audienceIcon: Record<BroadcastAudience, typeof Users> = {
  ALL_STUDENTS: GraduationCap,
  ALL_TEACHERS: Users,
  BOTH: UsersRound,
};

/**
 * Compose + send an SMS broadcast (INTEGRATION API: POST /broadcasts).
 * Title is optional; the body has a live character/segment counter; the
 * audience is picked from ALL_STUDENTS / ALL_TEACHERS / BOTH. Sending is
 * optimistic via the broadcast entity hook, so history updates instantly.
 */
export function BroadcastComposer() {
  const { t } = useTranslation();
  const toast = useToast();
  const createBroadcast = useCreateBroadcast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', text: '', audience: 'ALL_STUDENTS' },
  });

  const text = watch('text') ?? '';
  const audience = watch('audience');

  const segments = useMemo(
    () => Math.max(1, Math.ceil(text.length / SMS_SEGMENT_LEN)),
    [text.length],
  );

  const audienceLabel = (value: BroadcastAudience) =>
    t(`broadcast.audience.${value}`);

  const onValid = (values: FormValues) => {
    const dto = {
      title: values.title?.trim() || undefined,
      text: values.text.trim(),
      audience: values.audience,
    };

    createBroadcast.mutate(dto, {
      onSuccess: () => {
        toast.success(t('broadcast.sent'));
        reset({ title: '', text: '', audience: values.audience });
      },
      onError: (err) =>
        setError('root', {
          message: extractErrorMessage(err) ?? t('broadcast.sendError'),
        }),
    });
  };

  const textError =
    errors.text?.message === 'required'
      ? t('broadcast.textRequired')
      : errors.text?.message === 'max'
        ? t('broadcast.textTooLong', { max: MAX_LEN })
        : undefined;

  const counterOverLimit = text.length > MAX_LEN;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('broadcast.composeTitle')}</CardTitle>
        <CardDescription>{t('broadcast.composeHint')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
        <Input
          label={`${t('broadcast.title')} (${t('form.optional')})`}
          placeholder={t('broadcast.titlePlaceholder')}
          maxLength={120}
          {...register('title')}
        />

        <div>
          <Textarea
            label={t('broadcast.message')}
            placeholder={t('broadcast.messagePlaceholder')}
            rows={5}
            error={textError}
            aria-describedby="broadcast-counter"
            {...register('text')}
          />
          <div
            id="broadcast-counter"
            className="mt-1.5 flex items-center justify-between text-xs text-foreground-muted"
          >
            <span>{t('broadcast.segments', { count: segments })}</span>
            <span
              className={cn(
                'tabular-nums',
                counterOverLimit && 'font-medium text-danger',
              )}
            >
              {text.length}/{MAX_LEN}
            </span>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-foreground">
            {t('broadcast.audienceLabel')}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {AUDIENCES.map((value) => {
              const Icon = audienceIcon[value];
              const selected = audience === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('audience', value)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                      : 'border-border bg-surface text-foreground hover:bg-surface-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      selected ? 'text-primary' : 'text-foreground-muted',
                    )}
                    aria-hidden
                  />
                  <span className="font-medium">{audienceLabel(value)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {errors.root && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            loading={createBroadcast.isPending}
            disabled={counterOverLimit}
          >
            <Send className="h-4 w-4" aria-hidden />
            {t('broadcast.send')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
