import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Send, Users, GraduationCap, UsersRound, Target } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Select,
  Button,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { extractErrorMessage } from '@/shared/api';
import { useGroups } from '@/entities/group';
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
  'GROUP',
];

const schema = z
  .object({
    title: z.string().max(120, { message: 'max' }).optional(),
    text: z
      .string()
      .trim()
      .min(1, { message: 'required' })
      .max(MAX_LEN, { message: 'max' }),
    audience: z.enum(['ALL_STUDENTS', 'ALL_TEACHERS', 'BOTH', 'GROUP']),
    groupId: z.string().optional(),
  })
  // A GROUP broadcast must target a concrete group.
  .refine((v) => v.audience !== 'GROUP' || Boolean(v.groupId), {
    path: ['groupId'],
    message: 'required',
  });

type FormValues = z.infer<typeof schema>;

const audienceIcon: Record<BroadcastAudience, typeof Users> = {
  ALL_STUDENTS: GraduationCap,
  ALL_TEACHERS: Users,
  BOTH: UsersRound,
  GROUP: Target,
};

/**
 * Compose + send an SMS broadcast (INTEGRATION API: POST /broadcasts).
 * Title is optional; the body has a live character/segment counter; the
 * audience is one of ALL_STUDENTS / ALL_TEACHERS / BOTH / GROUP. Choosing GROUP
 * reveals a group picker and sends `audience=GROUP` + `groupId` to target that
 * group's active students. Sending is optimistic via the broadcast entity hook,
 * so history updates instantly.
 */
export function BroadcastComposer() {
  const { t } = useTranslation();
  const toast = useToast();
  const createBroadcast = useCreateBroadcast();

  // Pool of groups for the GROUP audience picker.
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const groupOptions = useMemo(
    () => (groupsData?.items ?? []).map((g) => ({ value: g.id, label: g.name })),
    [groupsData],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      text: '',
      audience: 'ALL_STUDENTS',
      groupId: '',
    },
  });

  const text = watch('text') ?? '';
  const audience = watch('audience');
  const groupId = watch('groupId') ?? '';

  const segments = useMemo(
    () => Math.max(1, Math.ceil(text.length / SMS_SEGMENT_LEN)),
    [text.length],
  );

  const audienceLabel = (value: BroadcastAudience) =>
    t(`broadcast.audience.${value}`);

  const selectAudience = (value: BroadcastAudience) => {
    setValue('audience', value);
    // Leaving GROUP clears any stale "pick a group" error.
    if (value !== 'GROUP') clearErrors('groupId');
  };

  const onValid = (values: FormValues) => {
    const dto = {
      title: values.title?.trim() || undefined,
      text: values.text.trim(),
      audience: values.audience,
      groupId: values.audience === 'GROUP' ? values.groupId : undefined,
    };

    // INSTANT feedback: the entity hook prepends an optimistic QUEUED row.
    createBroadcast.mutate(dto, {
      onSuccess: () => {
        toast.success(t('broadcast.sent'));
        reset({
          title: '',
          text: '',
          audience: values.audience,
          groupId: values.groupId,
        });
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIENCES.map((value) => {
              const Icon = audienceIcon[value];
              const selected = audience === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectAudience(value)}
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

          {/* Group picker — only relevant to the GROUP audience. */}
          {audience === 'GROUP' && (
            <div className="mt-3">
              <Select
                label={t('broadcast.group')}
                placeholder={t('broadcast.selectGroup')}
                options={groupOptions}
                value={groupId}
                onChange={(e) => {
                  setValue('groupId', e.target.value);
                  if (e.target.value) clearErrors('groupId');
                }}
                error={errors.groupId ? t('broadcast.groupRequired') : undefined}
              />
            </div>
          )}
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
