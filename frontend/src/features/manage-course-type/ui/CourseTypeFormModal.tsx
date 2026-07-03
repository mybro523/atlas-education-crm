import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';

import { FormModal, Input, useToast } from '@/shared/ui';
import {
  useCreateCourseType,
  useUpdateCourseType,
  type CourseType,
} from '@/entities/course-type';

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface CourseTypeFormModalProps {
  open: boolean;
  onClose: () => void;
  courseType?: CourseType | null;
}

/** Create/edit a CourseType. `name` is unique → 409 surfaces a duplicate error. */
export function CourseTypeFormModal({
  open,
  onClose,
  courseType,
}: CourseTypeFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(courseType);

  const createCourseType = useCreateCourseType();
  const updateCourseType = useUpdateCourseType();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: courseType?.name ?? '',
        isActive: courseType?.isActive ?? true,
      });
    }
  }, [open, courseType, reset]);

  const submitting = createCourseType.isPending || updateCourseType.isPending;

  const handleError = (err: unknown) => {
    if (isAxiosError(err) && err.response?.status === 409) {
      setError('name', { message: 'duplicate' });
      return;
    }
    toast.error(isEdit ? t('crud.updateError') : t('crud.createError'));
  };

  const onValid = (values: FormValues) => {
    const dto = { name: values.name.trim(), isActive: values.isActive };

    if (isEdit && courseType) {
      updateCourseType.mutate(
        { id: courseType.id, dto },
        {
          onSuccess: () => {
            toast.success(t('crud.updated'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createCourseType.mutate(dto, {
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
      ? t('courseTypes.duplicate')
      : t('crud.required')
    : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('courseTypes.editTitle') : t('courseTypes.addTitle')}
      onSubmit={handleSubmit(onValid)}
      submitting={submitting}
    >
      <Input
        label={t('courseTypes.name')}
        placeholder={t('courseTypes.namePlaceholder')}
        error={nameError}
        autoFocus
        {...register('name')}
      />
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
          {...register('isActive')}
        />
        {t('courseTypes.isActive')}
      </label>
    </FormModal>
  );
}
