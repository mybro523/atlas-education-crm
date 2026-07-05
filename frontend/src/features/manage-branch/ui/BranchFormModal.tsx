import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, useToast } from '@/shared/ui';
import {
  useCreateBranch,
  useUpdateBranch,
  type Branch,
} from '@/entities/branch';

/** Loose international phone check: 7–15 digits, allowing spaces / ( ) + - . */
function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return (
    /^\+?[\d\s()-]+$/.test(trimmed) &&
    digits.length >= 7 &&
    digits.length <= 15
  );
}

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }).max(120),
  address: z.string().trim().max(200).optional(),
  // Optional, but when filled it must look like a real phone number.
  phone: z
    .string()
    .trim()
    .max(25)
    .optional()
    .refine((v) => !v || isValidPhone(v), { message: 'phone' }),
});

type FormValues = z.infer<typeof schema>;

export interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this branch; otherwise it creates a new one. */
  branch?: Branch | null;
}

/**
 * Create/edit a Branch. Optimistic via the branch entity hooks; validated with
 * react-hook-form + zod. Localized, dark-mode ready, responsive.
 */
export function BranchFormModal({ open, onClose, branch }: BranchFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(branch);

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  // Sync form values whenever the target branch (or open state) changes.
  useEffect(() => {
    if (open) {
      reset({
        name: branch?.name ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
      });
    }
  }, [open, branch, reset]);

  // INSTANT-CLOSE: fire the optimistic mutation and close immediately — the
  // optimistic cache write already reflects the change; on error a toast fires
  // and the entity hook rolls the cache back.
  const onValid = (values: FormValues) => {
    const dto = {
      name: values.name.trim(),
      address: values.address?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
    };

    if (isEdit && branch) {
      updateBranch.mutate(
        { id: branch.id, dto },
        {
          onSuccess: () => toast.success(t('crud.updated')),
          onError: () => toast.error(t('crud.updateError')),
        },
      );
    } else {
      createBranch.mutate(dto, {
        onSuccess: () => toast.success(t('crud.created')),
        onError: () => toast.error(t('crud.createError')),
      });
    }

    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('branches.editTitle') : t('branches.addTitle')}
      onSubmit={handleSubmit(onValid)}
    >
      <Input
        label={t('branches.name')}
        placeholder={t('branches.namePlaceholder')}
        error={errors.name ? t('crud.required') : undefined}
        maxLength={120}
        autoFocus
        {...register('name')}
      />
      <Input
        label={t('branches.address')}
        placeholder={t('branches.addressPlaceholder')}
        maxLength={200}
        {...register('address')}
      />
      <Input
        label={t('branches.phone')}
        placeholder={t('branches.phonePlaceholder')}
        type="tel"
        inputMode="tel"
        maxLength={25}
        error={errors.phone ? t('form.requiredField') : undefined}
        {...register('phone')}
      />
    </FormModal>
  );
}
