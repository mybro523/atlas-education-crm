import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { useBranches } from '@/entities/branch';
import { useCreateRoom, useUpdateRoom, type Room } from '@/entities/room';

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
      // Send an explicit `null` when blank so the room detaches from its branch.
      updateRoom.mutate(
        {
          id: room.id,
          dto: { name, branchId: values.branchId || null, isActive: values.isActive },
        },
        {
          onSuccess: () => toast.success(t('crud.updated')),
          onError: () => toast.error(t('crud.updateError')),
        },
      );
    } else {
      createRoom.mutate(
        { name, branchId: values.branchId || undefined, isActive: values.isActive },
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
