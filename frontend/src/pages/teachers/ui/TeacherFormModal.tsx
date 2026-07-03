import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import { useSubjects } from '@/entities/subject';
import {
  useCreateTeacher,
  useUpdateTeacher,
  type Teacher,
  type CreateTeacherDto,
} from '@/entities/teacher';
import { SubjectMultiSelect } from './SubjectMultiSelect';

export interface TeacherFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this teacher; otherwise it creates one. */
  teacher?: Teacher | null;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  branchId?: string;
}

/**
 * Create/edit a teacher. On create the form also seeds initial subjects
 * (`subjectIds`); on edit, subjects are managed via the dedicated assign modal,
 * so the subject picker is hidden in edit mode. Both mutations are optimistic.
 */
export function TeacherFormModal({
  open,
  onClose,
  teacher,
}: TeacherFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(teacher);

  const { data: branches } = useBranches();
  const { data: subjects } = useSubjects();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever it opens (or the target teacher changes).
  useEffect(() => {
    if (!open) return;
    setFirstName(teacher?.firstName ?? '');
    setLastName(teacher?.lastName ?? '');
    setMiddleName(teacher?.middleName ?? '');
    setPhone(teacher?.phone ?? '');
    setBranchId(teacher?.branchId ?? '');
    setSubjectIds(teacher?.subjects?.map((s) => s.id) ?? []);
    setErrors({});
    setFormError(null);
  }, [open, teacher]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    if (!branchId) next.branchId = t('form.requiredField');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    if (isEdit && teacher) {
      updateTeacher.mutate(
        {
          id: teacher.id,
          dto: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            middleName: middleName.trim() || undefined,
            phone: phone.trim() || undefined,
            branchId,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('teachers.updated'));
            onClose();
          },
          onError: (err) =>
            setFormError(extractErrorMessage(err) ?? t('form.updateError')),
        },
      );
      return;
    }

    const dto: CreateTeacherDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      phone: phone.trim() || undefined,
      branchId,
      subjectIds: subjectIds.length ? subjectIds : undefined,
    };
    createTeacher.mutate(dto, {
      onSuccess: () => {
        toast.success(t('teachers.created'));
        onClose();
      },
      onError: (err) =>
        setFormError(extractErrorMessage(err) ?? t('form.createError')),
    });
  };

  const submitting = createTeacher.isPending || updateTeacher.isPending;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('teachers.editTitle') : t('teachers.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={formError ?? undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('fields.firstName')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          disabled={submitting}
          autoFocus
        />
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          disabled={submitting}
        />
        <Input
          label={`${t('fields.middleName')} (${t('form.optional')})`}
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          disabled={submitting}
        />
        <Input
          label={`${t('fields.phone')} (${t('form.optional')})`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting}
        />
      </div>

      <Select
        label={t('fields.branch')}
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
        placeholder={t('crud.allBranches')}
        error={errors.branchId}
        disabled={submitting}
        options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
      />

      {/* Initial subjects only on create; edit uses the assign-subjects modal. */}
      {!isEdit && (
        <SubjectMultiSelect
          label={t('fields.subjects')}
          subjects={subjects ?? []}
          value={subjectIds}
          onChange={setSubjectIds}
          disabled={submitting}
        />
      )}
    </FormModal>
  );
}
