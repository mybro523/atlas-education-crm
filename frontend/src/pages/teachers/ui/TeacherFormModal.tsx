import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import {
  isValidPersonName,
  isValidPhone,
  isValidTelegram,
  todayInput,
} from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useCreateTeacher,
  useUpdateTeacher,
  type Teacher,
  type CreateTeacherDto,
  type UpdateTeacherDto,
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
  middleName?: string;
  phone?: string;
  telegramUsername?: string;
  birthDate?: string;
  hireDate?: string;
  branchId?: string;
}

/** Trim an ISO datetime down to the `YYYY-MM-DD` a date input expects. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/**
 * Create/edit a teacher. What a teacher teaches is expressed through the groups
 * they lead (each group carries a course) — there is no subjects assignment.
 * Beyond the core identity + branch, the form captures optional profile fields:
 * specialty, education level, Telegram handle, birth date and hire date.
 *
 * Both mutations are optimistic and the modal closes INSTANTLY on submit — the
 * optimistic cache update shows the change immediately; a failed round-trip
 * rolls the cache back and surfaces a toast.
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
  const [specialty, setSpecialty] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset the form whenever it opens (or the target teacher changes).
  useEffect(() => {
    if (!open) return;
    setFirstName(teacher?.firstName ?? '');
    setLastName(teacher?.lastName ?? '');
    setMiddleName(teacher?.middleName ?? '');
    setPhone(teacher?.phone ?? '');
    setSpecialty(teacher?.specialty ?? '');
    setEducationLevel(teacher?.educationLevel ?? '');
    setTelegramUsername(teacher?.telegramUsername ?? '');
    setBirthDate(toDateInput(teacher?.birthDate));
    setHireDate(toDateInput(teacher?.hireDate));
    setBranchId(teacher?.branchId ?? '');
    setErrors({});
  }, [open, teacher]);

  const today = todayInput();

  const validate = (): boolean => {
    const next: FieldErrors = {};
    // Person names are letters-only (no digits): required + valid format.
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    else if (!isValidPersonName(firstName)) next.firstName = t('form.invalidName');
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    else if (!isValidPersonName(lastName)) next.lastName = t('form.invalidName');
    // Middle name is optional — validate its format only when filled in.
    if (middleName.trim() && !isValidPersonName(middleName))
      next.middleName = t('form.invalidName');
    if (!branchId) next.branchId = t('form.requiredField');
    // Optional fields: validate their format only when the user filled them in.
    if (phone.trim() && !isValidPhone(phone)) next.phone = t('form.invalidPhone');
    if (telegramUsername.trim() && !isValidTelegram(telegramUsername))
      next.telegramUsername = t('form.invalidTelegram');
    // A birth date cannot be in the future.
    if (birthDate && birthDate > today)
      next.birthDate = t('form.birthDateFuture');
    // Hiring cannot predate birth.
    if (birthDate && hireDate && hireDate < birthDate)
      next.hireDate = t('form.hireBeforeBirth');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const trimmedTelegram = telegramUsername.trim();

    if (isEdit && teacher) {
      // On edit, blanked clearable fields are sent as null / '' to clear them.
      const dto: UpdateTeacherDto = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        phone: phone.trim() || undefined,
        specialty: specialty.trim() || undefined,
        educationLevel: educationLevel.trim() || undefined,
        telegramUsername: trimmedTelegram || null,
        birthDate: birthDate || null,
        hireDate: hireDate || null,
        branchId,
      };
      updateTeacher.mutate(
        { id: teacher.id, dto },
        {
          onSuccess: () => toast.success(t('teachers.updated')),
          onError: (err) =>
            toast.error(extractErrorMessage(err) ?? t('form.updateError')),
        },
      );
      onClose();
      return;
    }

    const dto: CreateTeacherDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      phone: phone.trim() || undefined,
      specialty: specialty.trim() || undefined,
      educationLevel: educationLevel.trim() || undefined,
      telegramUsername: trimmedTelegram || undefined,
      birthDate: birthDate || undefined,
      hireDate: hireDate || undefined,
      branchId,
    };
    createTeacher.mutate(dto, {
      onSuccess: () => toast.success(t('teachers.created')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.createError')),
    });
    onClose();
  };

  const submitting = createTeacher.isPending || updateTeacher.isPending;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('teachers.editTitle') : t('teachers.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      className="max-w-2xl"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('fields.firstName')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          maxLength={100}
          autoFocus
        />
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          maxLength={100}
        />
        <Input
          label={`${t('fields.middleName')} (${t('form.optional')})`}
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          error={errors.middleName}
          maxLength={100}
        />
        <Input
          label={`${t('fields.phone')} (${t('form.optional')})`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          maxLength={25}
        />
        <Input
          label={`${t('fields.specialty')} (${t('form.optional')})`}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          maxLength={120}
        />
        <Input
          label={`${t('fields.educationLevel')} (${t('form.optional')})`}
          value={educationLevel}
          onChange={(e) => setEducationLevel(e.target.value)}
          maxLength={120}
        />
        <Input
          label={`${t('fields.telegram')} (${t('form.optional')})`}
          value={telegramUsername}
          onChange={(e) => setTelegramUsername(e.target.value)}
          error={errors.telegramUsername}
          placeholder="@username"
          maxLength={33}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Input
          label={`${t('fields.birthDate')} (${t('form.optional')})`}
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          error={errors.birthDate}
          max={today}
        />
        <Input
          label={`${t('fields.hireDate')} (${t('form.optional')})`}
          type="date"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          error={errors.hireDate}
          min={birthDate || undefined}
        />
        <Select
          label={t('fields.branch')}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          placeholder={t('crud.allBranches')}
          error={errors.branchId}
          options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />
      </div>
    </FormModal>
  );
}
