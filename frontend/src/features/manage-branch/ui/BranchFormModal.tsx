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

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
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

  const submitting = createBranch.isPending || updateBranch.isPending;

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
          onSuccess: () => {
            toast.success(t('crud.updated'));
            onClose();
          },
          onError: () => toast.error(t('crud.updateError')),
        },
      );
    } else {
      createBranch.mutate(dto, {
        onSuccess: () => {
          toast.success(t('crud.created'));
          onClose();
        },
        onError: () => toast.error(t('crud.createError')),
      });
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('branches.editTitle') : t('branches.addTitle')}
      onSubmit={handleSubmit(onValid)}
      submitting={submitting}
    >
      <Input
        label={t('branches.name')}
        placeholder={t('branches.namePlaceholder')}
        error={errors.name ? t('crud.required') : undefined}
        autoFocus
        {...register('name')}
      />
      <Input
        label={t('branches.address')}
        placeholder={t('branches.addressPlaceholder')}
        {...register('address')}
      />
      <Input
        label={t('branches.phone')}
        placeholder={t('branches.phonePlaceholder')}
        {...register('phone')}
      />
    </FormModal>
  );
}
