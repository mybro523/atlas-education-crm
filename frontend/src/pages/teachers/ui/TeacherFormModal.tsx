import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import {
  isValidPersonName,
  isValidPhone,
  isValidTelegram,
  isValidEmail,
  isValidAmount,
  parseAmount,
  todayInput,
  sanitizePersonName,
  sanitizePhone,
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

/** Education level dictionary — stored as stable codes, localized for display. */
const EDUCATION_LEVELS = ['NONE', 'SECONDARY', 'HIGHER'] as const;

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  telegramUsername?: string;
  birthDate?: string;
  hireDate?: string;
  branchId?: string;
  hourlyRate?: string;
  credEmail?: string;
  credPassword?: string;
}

/**
 * `UpdateTeacherDto` still types the optional text fields as
 * `string | undefined`, but the backend clears a stored value ONLY on an
 * explicit `null` — `undefined` leaves it untouched. Widen the payload type
 * locally so blanking middle name / phone / specialty / education level on
 * edit actually clears them. (`UpdateTeacherDto` is assignable to this type,
 * so the narrowing assertion at the mutate call site is safe.)
 */
type TeacherUpdatePayload = Omit<
  UpdateTeacherDto,
  'middleName' | 'phone' | 'specialty' | 'educationLevel'
> & {
  middleName?: string | null;
  phone?: string | null;
  specialty?: string | null;
  educationLevel?: string | null;
};

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
  const [hourlyRate, setHourlyRate] = useState('');
  const [branchId, setBranchId] = useState('');
  // Cabinet credentials: required on create; on edit the password stays empty
  // and the credentials are only (re)issued when the user types a new one.
  const [credEmail, setCredEmail] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setHourlyRate(teacher?.hourlyRate != null ? String(teacher.hourlyRate) : '');
    setBranchId(teacher?.branchId ?? '');
    setCredEmail(teacher?.user?.email ?? '');
    setCredPassword('');
    setShowPassword(false);
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
    // Hourly rate: optional, but when entered must be a valid non-negative amount.
    if (hourlyRate.trim() && !isValidAmount(hourlyRate))
      next.hourlyRate = t('form.invalidAmount');
    // Cabinet credentials: required on create; on edit only validated when the
    // user typed a new password (which is what triggers re-issuing the login).
    if (!isEdit || credPassword) {
      if (!credEmail.trim()) next.credEmail = t('form.requiredField');
      else if (!isValidEmail(credEmail)) next.credEmail = t('form.invalidEmail');
      if (!credPassword) next.credPassword = t('form.requiredField');
      else if (credPassword.length < 4)
        next.credPassword = t('form.passwordMin');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const trimmedTelegram = telegramUsername.trim();
    const parsedRate = parseAmount(hourlyRate);
    // Credentials are only sent when a password was typed: always on create
    // (validated as required), and on edit when the login is being re-issued.
    const credentials = credPassword
      ? { email: credEmail.trim(), password: credPassword }
      : undefined;

    if (isEdit && teacher) {
      // On edit, blanked clearable fields are sent as an EXPLICIT null — the
      // backend treats null as "clear this field" while undefined keeps the
      // previously stored value.
      const dto: TeacherUpdatePayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || null,
        phone: phone.trim() || null,
        specialty: specialty.trim() || null,
        educationLevel: educationLevel.trim() || null,
        telegramUsername: trimmedTelegram || null,
        birthDate: birthDate || null,
        hireDate: hireDate || null,
        hourlyRate: parsedRate,
        branchId,
        credentials,
      };
      updateTeacher.mutate(
        { id: teacher.id, dto: dto as UpdateTeacherDto },
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
      hourlyRate: parsedRate ?? undefined,
      branchId,
      credentials,
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
          onChange={(e) => setFirstName(sanitizePersonName(e.target.value))}
          error={errors.firstName}
          maxLength={100}
          autoFocus
        />
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(sanitizePersonName(e.target.value))}
          error={errors.lastName}
          maxLength={100}
        />
        <Input
          label={`${t('fields.middleName')} (${t('form.optional')})`}
          value={middleName}
          onChange={(e) => setMiddleName(sanitizePersonName(e.target.value))}
          error={errors.middleName}
          maxLength={100}
        />
        <Input
          label={`${t('fields.phone')} (${t('form.optional')})`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(sanitizePhone(e.target.value))}
          error={errors.phone}
          maxLength={25}
        />
        <Input
          label={`${t('fields.specialty')} (${t('form.optional')})`}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          maxLength={120}
        />
        <Select
          label={`${t('fields.educationLevel')} (${t('form.optional')})`}
          value={educationLevel}
          onChange={(e) => setEducationLevel(e.target.value)}
          options={[
            { value: '', label: t('form.notSelected') },
            ...EDUCATION_LEVELS.map((lvl) => ({
              value: lvl,
              label: t(`teachers.education.${lvl}`),
            })),
            // Keep a legacy free-text value selectable so editing an older
            // teacher does not silently drop it.
            ...(educationLevel &&
            !EDUCATION_LEVELS.includes(
              educationLevel as (typeof EDUCATION_LEVELS)[number],
            )
              ? [{ value: educationLevel, label: educationLevel }]
              : []),
          ]}
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
        <Input
          label={`${t('fields.hourlyRate')} (${t('form.optional')})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          error={errors.hourlyRate}
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

      {/* Cabinet credentials — the login the teacher uses to enter the system.
          Required on create; on edit the password field stays empty and the
          login is only re-issued when a new password is typed. */}
      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('teachers.credentialsTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {t('teachers.credentialsHint')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('fields.login')}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={credEmail}
            onChange={(e) => setCredEmail(e.target.value)}
            error={errors.credEmail}
            maxLength={254}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Input
            label={
              isEdit
                ? `${t('fields.password')} (${t('form.optional')})`
                : t('fields.password')
            }
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={credPassword}
            onChange={(e) => setCredPassword(e.target.value)}
            error={errors.credPassword}
            placeholder={isEdit ? t('form.changePassword') : undefined}
            maxLength={72}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                }
                title={
                  showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                }
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
          />
        </div>
      </div>
    </FormModal>
  );
}
