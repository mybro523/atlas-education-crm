import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import {
  useCreateGroup,
  useUpdateGroup,
  type Group,
  type CreateGroupDto,
} from '@/entities/group';
import { useCourses } from '@/entities/course';
import { useTeachers } from '@/entities/teacher';
import { useBranches } from '@/entities/branch';

export interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, edits this group; otherwise creates a new one. */
  group?: Group | null;
  onSaved?: (created: boolean) => void;
}

interface FormState {
  name: string;
  courseId: string;
  teacherId: string;
  branchId: string;
  isActive: boolean;
}

/** Backend accepts a non-empty string; cap length client-side to keep it sane. */
const NAME_MAX = 120;

const EMPTY: FormState = {
  name: '',
  courseId: '',
  teacherId: '',
  branchId: '',
  isActive: true,
};

/** Create / edit a learning group (contract §7). Optimistic save. */
export function GroupFormModal({
  open,
  onClose,
  group,
  onSaved,
}: GroupFormModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(group);

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const submitting = createGroup.isPending || updateGroup.isPending;

  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });
  const { data: branches } = useBranches();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    if (group) {
      setForm({
        name: group.name,
        courseId: group.courseId,
        teacherId: group.teacherId ?? '',
        branchId: group.branchId,
        isActive: group.isActive,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, group]);

  const courseOptions = useMemo(
    () => (coursesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [coursesData],
  );
  const teacherOptions = useMemo(
    () =>
      (teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      })),
    [teachersData],
  );
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = t('form.required');
    if (!form.courseId) next.courseId = t('form.required');
    if (!form.branchId) next.branchId = t('form.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const dto: CreateGroupDto = {
      name: form.name.trim(),
      courseId: form.courseId,
      teacherId: form.teacherId || undefined,
      branchId: form.branchId,
      isActive: form.isActive,
    };

    const onError = (error: unknown) => {
      setFormError(extractErrorMessage(error) ?? t('groups.saveError'));
    };
    const onSuccess = () => {
      onSaved?.(!isEdit);
      onClose();
    };

    if (group) {
      updateGroup.mutate({ id: group.id, dto }, { onSuccess, onError });
    } else {
      createGroup.mutate(dto, { onSuccess, onError });
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('groups.editTitle') : t('groups.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={formError ?? undefined}
    >
      <Input
        label={t('groups.fields.name')}
        placeholder={t('groups.fields.namePlaceholder')}
        value={form.name}
        onChange={(e) => setField('name', e.target.value)}
        error={errors.name}
        maxLength={NAME_MAX}
        autoFocus
      />

      <Select
        label={t('groups.fields.course')}
        placeholder={t('groups.fields.coursePlaceholder')}
        options={courseOptions}
        value={form.courseId}
        onChange={(e) => setField('courseId', e.target.value)}
        error={errors.courseId}
      />

      <Select
        label={t('groups.fields.teacher')}
        placeholder={t('groups.fields.teacherPlaceholder')}
        options={teacherOptions}
        value={form.teacherId}
        onChange={(e) => setField('teacherId', e.target.value)}
      />

      <Select
        label={t('groups.fields.branch')}
        placeholder={t('groups.fields.branchPlaceholder')}
        options={branchOptions}
        value={form.branchId}
        onChange={(e) => setField('branchId', e.target.value)}
        error={errors.branchId}
      />

      <label className="flex items-center gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setField('isActive', e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
        />
        {t('groups.fields.isActive')}
      </label>
    </FormModal>
  );
}
