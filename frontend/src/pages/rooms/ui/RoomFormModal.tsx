import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Ban } from 'lucide-react';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useBranches } from '@/entities/branch';
import { useCreateRoom, useUpdateRoom, type Room } from '@/entities/room';

/** Preset schedule-card tints (hex #RRGGBB) offered as swatches. */
const COLOR_PRESETS = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#16A34A', // Green
  '#0D9488', // Teal
  '#0891B2', // Cyan
  '#64748B', // Slate
] as const;

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }).max(120),
  // Empty string = branch-less (a room may be shared / unassigned).
  branchId: z.string(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface RoomFormModalProps {
  open: boolean;
  onClose: () => void;
  room?: Room | null;
}

/**
 * Create/edit a Room (kabinet). `branch` is optional — leaving it blank keeps
 * the room branch-less; on edit, blanking it detaches the room. Optimistic.
 */
export function RoomFormModal({ open, onClose, room }: RoomFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(room);

  const { data: branches } = useBranches();

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  // Swatch picker lives outside RHF (simple click-to-select, no validation).
  const [color, setColor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', branchId: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: room?.name ?? '',
        branchId: room?.branchId ?? '',
        isActive: room?.isActive ?? true,
      });
      setColor(room?.color ?? null);
    }
  }, [open, room, reset]);

  const branchOptions = useMemo(
    () => [
      { value: '', label: t('rooms.noBranch') },
      ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches, t],
  );

  // INSTANT-CLOSE: fire optimistically and close immediately.
  const onValid = (values: FormValues) => {
    const name = values.name.trim();

    if (isEdit && room) {
      // Send an explicit `null` when blank so the room detaches from its
      // branch / clears its color.
      updateRoom.mutate(
        {
          id: room.id,
          dto: {
            name,
            branchId: values.branchId || null,
            color,
            isActive: values.isActive,
          },
        },
        {
          onSuccess: () => toast.success(t('crud.updated')),
          onError: () => toast.error(t('crud.updateError')),
        },
      );
    } else {
      createRoom.mutate(
        {
          name,
          branchId: values.branchId || undefined,
          color: color ?? undefined,
          isActive: values.isActive,
        },
        {
          onSuccess: () => toast.success(t('crud.created')),
          onError: () => toast.error(t('crud.createError')),
        },
      );
    }

    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('rooms.editTitle') : t('rooms.addTitle')}
      onSubmit={handleSubmit(onValid)}
    >
      <Input
        label={t('rooms.name')}
        placeholder={t('rooms.namePlaceholder')}
        error={errors.name ? t('crud.required') : undefined}
        maxLength={120}
        autoFocus
        {...register('name')}
      />

      <Select
        label={`${t('rooms.branch')} (${t('form.optional')})`}
        options={branchOptions}
        {...register('branchId')}
      />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          {`${t('fields.color')} (${t('form.optional')})`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {/* "No color" — clears the tint (sends null on edit). */}
          <button
            type="button"
            aria-label={t('crud.no')}
            aria-pressed={color === null}
            onClick={() => setColor(null)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground-muted transition-shadow hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              color === null &&
                'ring-2 ring-ring ring-offset-2 ring-offset-surface',
            )}
          >
            <Ban className="h-4 w-4" aria-hidden />
          </button>
          {COLOR_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={color === hex}
              onClick={() => setColor(hex)}
              className={cn(
                'h-7 w-7 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                color === hex &&
                  'ring-2 ring-ring ring-offset-2 ring-offset-surface',
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-foreground-muted">
          {t('rooms.colorHint')}
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
          {...register('isActive')}
        />
        {t('rooms.isActive')}
      </label>
    </FormModal>
  );
}
