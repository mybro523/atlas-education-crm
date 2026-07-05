import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { useBranches } from '@/entities/branch';
import { useCourseTypes } from '@/entities/course-type';
import {
  useCreateCourse,
  useUpdateCourse,
  type Course,
  type CreateCourseDto,
  type UpdateCourseDto,
} from '@/entities/course';

const schema = z
  .object({
    name: z.string().trim().min(1, { message: 'required' }).max(120),
    courseTypeId: z.string().min(1, { message: 'required' }),
    branchId: z.string().min(1, { message: 'required' }),
    // Coerce the numeric string from the input; tuition must be a positive,
    // sanely-bounded number (empty input coerces to 0 → fails the > 0 rule).
    pricePerMonth: z.coerce
      .number({ invalid_type_error: 'required' })
      .gt(0, { message: 'min' })
      .max(1_000_000, { message: 'min' }),
    // Optional term dates (empty string = not set).
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean(),
  })
  // Date-only ISO strings sort chronologically, so a string compare is enough.
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    path: ['endDate'],
    message: 'range',
  });

type FormValues = z.infer<typeof schema>;

/** Trim an ISO timestamp down to the `YYYY-MM-DD` a `<input type="date">` wants. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
}

/**
 * Create/edit a Course. References the course-type / branch dictionaries via
 * select inputs and carries optional term dates. Optimistic + localized.
 */
export function CourseFormModal({ open, onClose, course }: CourseFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(course);

  const { data: branches } = useBranches();
  // Only active course-types are selectable for new courses; when editing keep
  // the current one visible even if it was since deactivated.
  const { data: courseTypes } = useCourseTypes();

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      courseTypeId: '',
      branchId: '',
      pricePerMonth: 0,
      startDate: '',
      endDate: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: course?.name ?? '',
        courseTypeId: course?.courseTypeId ?? '',
        branchId: course?.branchId ?? '',
        pricePerMonth: course?.pricePerMonth ?? 0,
        startDate: toDateInput(course?.startDate),
        endDate: toDateInput(course?.endDate),
        isActive: course?.isActive ?? true,
      });
    }
  }, [open, course, reset]);

  const submitting = createCourse.isPending || updateCourse.isPending;

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );
  const courseTypeOptions = useMemo(
    () =>
      (courseTypes ?? [])
        .filter((ct) => ct.isActive || ct.id === course?.courseTypeId)
        .map((ct) => ({ value: ct.id, label: ct.name })),
    [courseTypes, course?.courseTypeId],
  );

  const onValid = (values: FormValues) => {
    // Only send dates that are set — omitting them avoids clobbering the
    // optimistic cache (and, on edit, leaves an existing value untouched).
    const dto: CreateCourseDto & UpdateCourseDto = {
      name: values.name.trim(),
      courseTypeId: values.courseTypeId,
      branchId: values.branchId,
      pricePerMonth: values.pricePerMonth,
      isActive: values.isActive,
      ...(values.startDate ? { startDate: values.startDate } : {}),
      ...(values.endDate ? { endDate: values.endDate } : {}),
    };

    if (isEdit && course) {
      updateCourse.mutate(
        { id: course.id, dto },
        {
          onSuccess: () => {
            toast.success(t('crud.updated'));
            onClose();
          },
          onError: () => toast.error(t('crud.updateError')),
        },
      );
    } else {
      createCourse.mutate(dto, {
        onSuccess: () => {
          toast.success(t('crud.created'));
          onClose();
        },
        onError: () => toast.error(t('crud.createError')),
      });
    }
  };

  const priceError = errors.pricePerMonth
    ? errors.pricePerMonth.message === 'min'
      ? t('courses.priceMin')
      : t('crud.required')
    : undefined;

  const endDateError =
    errors.endDate?.message === 'range' ? t('courses.dateRange') : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('courses.editTitle') : t('courses.addTitle')}
      onSubmit={handleSubmit(onValid)}
      submitting={submitting}
    >
      <Input
        label={t('courses.name')}
        placeholder={t('courses.namePlaceholder')}
        error={errors.name ? t('crud.required') : undefined}
        maxLength={120}
        autoFocus
        {...register('name')}
      />

      <Select
        label={t('courses.courseType')}
        placeholder={t('courses.selectCourseType')}
        options={courseTypeOptions}
        error={errors.courseTypeId ? t('crud.required') : undefined}
        {...register('courseTypeId')}
      />

      <Select
        label={t('courses.branch')}
        placeholder={t('courses.selectBranch')}
        options={branchOptions}
        error={errors.branchId ? t('crud.required') : undefined}
        {...register('branchId')}
      />

      <Input
        label={t('courses.pricePerMonth')}
        placeholder={t('courses.pricePerMonthPlaceholder')}
        type="number"
        inputMode="decimal"
        min={0}
        max={1000000}
        step="0.01"
        error={priceError}
        {...register('pricePerMonth')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={`${t('courses.startDate')} (${t('form.optional')})`}
          type="date"
          {...register('startDate')}
        />
        <Input
          label={`${t('courses.endDate')} (${t('form.optional')})`}
          type="date"
          error={endDateError}
          {...register('endDate')}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
          {...register('isActive')}
        />
        {t('courses.isActive')}
      </label>
    </FormModal>
  );
}
