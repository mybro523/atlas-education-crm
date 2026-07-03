import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useSubjects } from '@/entities/subject';
import { useSetTeacherSubjects, type Teacher } from '@/entities/teacher';
import { SubjectMultiSelect } from './SubjectMultiSelect';

export interface AssignSubjectsModalProps {
  open: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

/**
 * Replace the full set of subjects a teacher teaches
 * (PUT /teachers/:id/subjects). Optimistic via `useSetTeacherSubjects`.
 */
export function AssignSubjectsModal({
  open,
  onClose,
  teacher,
}: AssignSubjectsModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: subjects } = useSubjects();
  const setSubjects = useSetTeacherSubjects();

  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(teacher?.subjects?.map((s) => s.id) ?? []);
    setFormError(null);
  }, [open, teacher]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teacher) return;
    setFormError(null);
    setSubjects.mutate(
      { id: teacher.id, dto: { subjectIds: selected } },
      {
        onSuccess: () => {
          toast.success(t('teachers.subjectsUpdated'));
          onClose();
        },
        onError: (err) =>
          setFormError(extractErrorMessage(err) ?? t('form.updateError')),
      },
    );
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('teachers.assignSubjectsTitle')}
      onSubmit={handleSubmit}
      submitting={setSubjects.isPending}
      error={formError ?? undefined}
    >
      <p className="text-sm text-foreground-muted">
        {t('teachers.assignSubjectsHint')}
      </p>
      <SubjectMultiSelect
        subjects={subjects ?? []}
        value={selected}
        onChange={setSelected}
        disabled={setSubjects.isPending}
      />
    </FormModal>
  );
}
