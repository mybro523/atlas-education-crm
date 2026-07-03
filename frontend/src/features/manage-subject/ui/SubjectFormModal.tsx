import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';

import { FormModal, Input, useToast } from '@/shared/ui';
import {
  useCreateSubject,
  useUpdateSubject,
  type Subject,
} from '@/entities/subject';

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }),
});

type FormValues = z.infer<typeof schema>;

export interface SubjectFormModalProps {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
}

/** Create/edit a Subject. `name` is unique → 409 surfaces a duplicate error. */
export function SubjectFormModal({
  open,
  onClose,
  subject,
}: SubjectFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(subject);

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) reset({ name: subject?.name ?? '' });
  }, [open, subject, reset]);

  const submitting = createSubject.isPending || updateSubject.isPending;

  const handleError = (err: unknown) => {
    if (isAxiosError(err) && err.response?.status === 409) {
      setError('name', { message: 'duplicate' });
      return;
    }
    toast.error(isEdit ? t('crud.updateError') : t('crud.createError'));
  };

  const onValid = (values: FormValues) => {
    const dto = { name: values.name.trim() };

    if (isEdit && subject) {
      updateSubject.mutate(
        { id: subject.id, dto },
        {
          onSuccess: () => {
            toast.success(t('crud.updated'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createSubject.mutate(dto, {
        onSuccess: () => {
          toast.success(t('crud.created'));
          onClose();
        },
        onError: handleError,
      });
    }
  };

  const nameError = errors.name
    ? errors.name.message === 'duplicate'
      ? t('subjects.duplicate')
      : t('crud.required')
    : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('subjects.editTitle') : t('subjects.addTitle')}
      onSubmit={handleSubmit(onValid)}
      submitting={submitting}
    >
      <Input
        label={t('subjects.name')}
        placeholder={t('subjects.namePlaceholder')}
        error={nameError}
        autoFocus
        {...register('name')}
      />
    </FormModal>
  );
}
