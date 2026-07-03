import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { useBranches } from '@/entities/branch';
import { useSubjects } from '@/entities/subject';
import { useCourseTypes } from '@/entities/course-type';
import {
  useCreateCourse,
  useUpdateCourse,
  type Course,
} from '@/entities/course';

const schema = z.object({
  name: z.string().trim().min(1, { message: 'required' }),
  courseTypeId: z.string().min(1, { message: 'required' }),
  subjectId: z.string().min(1, { message: 'required' }),
  branchId: z.string().min(1, { message: 'required' }),
  // Coerce the numeric string from the input; must be a non-negative number.
  pricePerMonth: z.coerce
    .number({ invalid_type_error: 'required' })
    .min(0, { message: 'min' }),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
}

/**
 * Create/edit a Course. References course-type / subject / branch dictionaries
 * via select inputs (loaded through their entity hooks). Optimistic + localized.
 */
export function CourseFormModal({ open, onClose, course }: CourseFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(course);

  const { data: branches } = useBranches();
  const { data: subjects } = useSubjects();
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
      subjectId: '',
      branchId: '',
      pricePerMonth: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: course?.name ?? '',
        courseTypeId: course?.courseTypeId ?? '',
        subjectId: course?.subjectId ?? '',
        branchId: course?.branchId ?? '',
        pricePerMonth: course?.pricePerMonth ?? 0,
        isActive: course?.isActive ?? true,
      });
    }
  }, [open, course, reset]);

  const submitting = createCourse.isPending || updateCourse.isPending;

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );
  const subjectOptions = useMemo(
    () => (subjects ?? []).map((s) => ({ value: s.id, label: s.name })),
    [subjects],
  );
  const courseTypeOptions = useMemo(
    () =>
      (courseTypes ?? [])
        .filter((ct) => ct.isActive || ct.id === course?.courseTypeId)
        .map((ct) => ({ value: ct.id, label: ct.name })),
    [courseTypes, course?.courseTypeId],
  );

  const onValid = (values: FormValues) => {
    const dto = {
      name: values.name.trim(),
      courseTypeId: values.courseTypeId,
      subjectId: values.subjectId,
      branchId: values.branchId,
      pricePerMonth: values.pricePerMonth,
      isActive: values.isActive,
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
        label={t('courses.subject')}
        placeholder={t('courses.selectSubject')}
        options={subjectOptions}
        error={errors.subjectId ? t('crud.required') : undefined}
        {...register('subjectId')}
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
        step="0.01"
        error={priceError}
        {...register('pricePerMonth')}
      />

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
