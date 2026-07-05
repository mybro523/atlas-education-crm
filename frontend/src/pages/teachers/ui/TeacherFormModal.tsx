import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useCreateTeacher,
  useUpdateTeacher,
  type Teacher,
  type CreateTeacherDto,
} from '@/entities/teacher';

export interface TeacherFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this teacher; otherwise it creates one. */
  teacher?: Teacher | null;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  branchId?: string;
}

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

/**
 * Create/edit a teacher. Subjects were removed from the model — what a teacher
 * teaches is now expressed through the groups they lead (each group carries a
 * course), so the form only captures the teacher's identity + branch. Both
 * mutations are optimistic.
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
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
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
    setErrors({});
    setFormError(null);
  }, [open, teacher]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    if (!branchId) next.branchId = t('form.requiredField');
    // Phone is optional; validate its format only when the user filled it in.
    if (phone.trim() && !isValidPhone(phone)) next.phone = t('form.requiredField');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const dto: CreateTeacherDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      phone: phone.trim() || undefined,
      branchId,
    };

    if (isEdit && teacher) {
      updateTeacher.mutate(
        { id: teacher.id, dto },
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
          maxLength={100}
          disabled={submitting}
          autoFocus
        />
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          maxLength={100}
          disabled={submitting}
        />
        <Input
          label={`${t('fields.middleName')} (${t('form.optional')})`}
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          maxLength={100}
          disabled={submitting}
        />
        <Input
          label={`${t('fields.phone')} (${t('form.optional')})`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          maxLength={25}
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
    </FormModal>
  );
}
