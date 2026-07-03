import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useCreateStudent,
  useUpdateStudent,
  type Student,
  type CreateStudentDto,
} from '@/entities/student';
import { ParentsEditor, type ParentDraft } from '@/features/manage-parents';

export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, edits this student; otherwise creates one. */
  student?: Student | null;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  branchId?: string;
}

/** Trim an ISO datetime down to the `YYYY-MM-DD` a date input expects. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/**
 * Create/edit a student with a nested parents editor. On create, staged parent
 * drafts are sent inline with the student; on edit, the parents editor persists
 * changes live via the parent sub-routes. All mutations optimistic.
 */
export function StudentFormModal({
  open,
  onClose,
  student,
}: StudentFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(student);

  const { data: branches } = useBranches();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [parentDrafts, setParentDrafts] = useState<ParentDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(student?.firstName ?? '');
    setLastName(student?.lastName ?? '');
    setMiddleName(student?.middleName ?? '');
    setPhone(student?.phone ?? '');
    setBirthDate(toDateInput(student?.birthDate));
    setEnrollmentDate(toDateInput(student?.enrollmentDate));
    setBranchId(student?.branchId ?? '');
    setIsActive(student?.isActive ?? true);
    setParentDrafts([]);
    setErrors({});
    setFormError(null);
  }, [open, student]);

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

    if (isEdit && student) {
      updateStudent.mutate(
        {
          id: student.id,
          dto: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            middleName: middleName.trim() || undefined,
            phone: phone.trim() || undefined,
            birthDate: birthDate || undefined,
            enrollmentDate: enrollmentDate || undefined,
            branchId,
            isActive,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('students.updated'));
            onClose();
          },
          onError: (err) =>
            setFormError(extractErrorMessage(err) ?? t('form.updateError')),
        },
      );
      return;
    }

    const dto: CreateStudentDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      phone: phone.trim() || undefined,
      birthDate: birthDate || undefined,
      enrollmentDate: enrollmentDate || undefined,
      branchId,
      isActive,
      parents: parentDrafts.length
        ? parentDrafts.map(({ _localId: _drop, id: _id, ...p }) => p)
        : undefined,
    };
    createStudent.mutate(dto, {
      onSuccess: () => {
        toast.success(t('students.created'));
        onClose();
      },
      onError: (err) =>
        setFormError(extractErrorMessage(err) ?? t('form.createError')),
    });
  };

  const submitting = createStudent.isPending || updateStudent.isPending;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('students.editTitle') : t('students.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={formError ?? undefined}
      className="max-w-2xl"
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
        <Input
          label={`${t('fields.birthDate')} (${t('form.optional')})`}
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={submitting}
        />
        <Input
          label={t('fields.enrollmentDate')}
          type="date"
          value={enrollmentDate}
          onChange={(e) => setEnrollmentDate(e.target.value)}
          disabled={submitting}
        />
        <Select
          label={t('fields.branch')}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          placeholder={t('crud.allBranches')}
          error={errors.branchId}
          disabled={submitting}
          options={(branches ?? []).map((b) => ({
            value: b.id,
            label: b.name,
          }))}
        />
        <Select
          label={t('fields.status')}
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
          disabled={submitting}
          options={[
            { value: 'active', label: t('students.active') },
            { value: 'inactive', label: t('students.inactive') },
          ]}
        />
      </div>

      <div className="border-t border-border pt-4">
        <ParentsEditor
          studentId={isEdit ? student?.id : undefined}
          value={parentDrafts}
          onChange={setParentDrafts}
        />
      </div>
    </FormModal>
  );
}
