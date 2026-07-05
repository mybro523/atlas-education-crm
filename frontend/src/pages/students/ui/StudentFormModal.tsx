import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import {
  isValidPersonName,
  isValidPhone,
  isValidAmount,
  isFutureDate,
} from '@/shared/lib';
import { useBranches } from '@/entities/branch';
import { useCourses } from '@/entities/course';
import {
  useCreateStudent,
  useUpdateStudent,
  type Student,
  type CreateStudentDto,
  type UpdateStudentDto,
  type StudentLevel,
  type ReferralSource,
} from '@/entities/student';
import {
  ParentFigureFields,
  figureFromParent,
  isParentFigureFilled,
  parentFigureToDto,
  type ParentFigureDraft,
  type ParentFigureErrors,
} from '@/features/manage-parents';
import {
  STUDENT_LEVELS,
  REFERRAL_SOURCES,
  levelLabelKey,
  referralLabelKey,
} from '../lib/studentEnums';

export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, edits this student; otherwise creates one. */
  student?: Student | null;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  birthDate?: string;
  enrollmentDate?: string;
  branchId?: string;
  courseFee?: string;
}

/** Parse a validated fee string to a number (null when blank). */
function parseFee(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed.replace(',', '.'));
}

/** Trim an ISO datetime down to the `YYYY-MM-DD` a date input expects. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Today as `YYYY-MM-DD` (local) — the latest sensible birth/enrollment date. */
function todayInput(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Create/edit a student. Parents are captured through two explicit blocks —
 * ОТЕЦ (father) and МАТЬ (mother) — sent to the API as the `father` / `mother`
 * slots (persisted with the FATHER / MOTHER relation). Both blocks are optional;
 * a filled block requires a name + phone. All mutations are optimistic.
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
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [level, setLevel] = useState<StudentLevel | ''>('');
  const [referralSource, setReferralSource] = useState<ReferralSource | ''>('');
  const [courseFee, setCourseFee] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [father, setFather] = useState<ParentFigureDraft>(figureFromParent());
  const [mother, setMother] = useState<ParentFigureDraft>(figureFromParent());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [fatherErrors, setFatherErrors] = useState<ParentFigureErrors>({});
  const [motherErrors, setMotherErrors] = useState<ParentFigureErrors>({});

  useEffect(() => {
    if (!open) return;
    setFirstName(student?.firstName ?? '');
    setLastName(student?.lastName ?? '');
    setMiddleName(student?.middleName ?? '');
    setPhone(student?.phone ?? '');
    setBirthDate(toDateInput(student?.birthDate));
    setEnrollmentDate(toDateInput(student?.enrollmentDate));
    setBranchId(student?.branchId ?? '');
    setCourseId(student?.courseId ?? '');
    setLevel(student?.level ?? '');
    setReferralSource(student?.referralSource ?? '');
    setCourseFee(student?.courseFee != null ? String(student.courseFee) : '');
    setIsActive(student?.isActive ?? true);
    setFather(
      figureFromParent(
        student?.parents?.find((p) => p.relation === 'FATHER') ?? null,
      ),
    );
    setMother(
      figureFromParent(
        student?.parents?.find((p) => p.relation === 'MOTHER') ?? null,
      ),
    );
    setErrors({});
    setFatherErrors({});
    setMotherErrors({});
  }, [open, student]);

  const today = todayInput();

  /** Validate a parent block only when it has been filled in. */
  const validateFigure = (figure: ParentFigureDraft): ParentFigureErrors => {
    if (!isParentFigureFilled(figure)) return {};
    const next: ParentFigureErrors = {};
    if (!figure.lastName.trim()) next.lastName = t('form.requiredField');
    else if (!isValidPersonName(figure.lastName))
      next.lastName = t('form.invalidName');
    if (!figure.firstName.trim()) next.firstName = t('form.requiredField');
    else if (!isValidPersonName(figure.firstName))
      next.firstName = t('form.invalidName');
    if (!figure.phone.trim()) next.phone = t('form.requiredField');
    else if (!isValidPhone(figure.phone)) next.phone = t('form.invalidPhone');
    return next;
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    // Person names: required + letters-only (no digits/symbols).
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    else if (!isValidPersonName(firstName)) next.firstName = t('form.invalidName');
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    else if (!isValidPersonName(lastName)) next.lastName = t('form.invalidName');
    // Middle name is optional; when filled it must still be a valid person name.
    if (middleName.trim() && !isValidPersonName(middleName))
      next.middleName = t('form.invalidName');
    if (!branchId) next.branchId = t('form.requiredField');
    // Optional fields: validate only when the user filled them in.
    if (phone.trim() && !isValidPhone(phone)) next.phone = t('form.invalidPhone');
    // A birth date cannot be in the future.
    if (birthDate && isFutureDate(birthDate))
      next.birthDate = t('form.birthDateFuture');
    // Enrollment cannot predate birth (future enrollment is allowed — a student
    // may be pre-enrolled for an upcoming term).
    if (birthDate && enrollmentDate && enrollmentDate < birthDate)
      next.enrollmentDate = t('form.requiredField');
    // Course fee: optional, but when entered must be a valid non-negative amount.
    if (courseFee.trim() && !isValidAmount(courseFee))
      next.courseFee = t('form.invalidAmount');

    const fErr = validateFigure(father);
    const mErr = validateFigure(mother);

    setErrors(next);
    setFatherErrors(fErr);
    setMotherErrors(mErr);

    return (
      Object.keys(next).length === 0 &&
      Object.keys(fErr).length === 0 &&
      Object.keys(mErr).length === 0
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const fatherDto = parentFigureToDto(father);
    const motherDto = parentFigureToDto(mother);
    // Shared enum/course/fee slots. Empty selects clear the field (null), which
    // the backend treats as "disconnect / unset" — an empty string would fail the
    // @IsEnum / @IsString checks.
    const shared = {
      courseId: courseId || null,
      level: level || null,
      referralSource: referralSource || null,
      courseFee: parseFee(courseFee),
    };

    if (isEdit && student) {
      const dto: UpdateStudentDto = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        enrollmentDate: enrollmentDate || undefined,
        branchId,
        isActive,
        ...shared,
        father: fatherDto,
        mother: motherDto,
      };
      updateStudent.mutate(
        { id: student.id, dto },
        {
          onSuccess: () => toast.success(t('students.updated')),
          onError: (err) =>
            toast.error(extractErrorMessage(err) ?? t('form.updateError')),
        },
      );
    } else {
      const dto: CreateStudentDto = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        enrollmentDate: enrollmentDate || undefined,
        branchId,
        isActive,
        ...shared,
        father: fatherDto,
        mother: motherDto,
      };
      createStudent.mutate(dto, {
        onSuccess: () => toast.success(t('students.created')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.createError')),
      });
    }

    // INSTANT-CLOSE: the optimistic cache update already reflects the change, so
    // close immediately instead of blocking on the network round-trip. On error
    // the mutation rolls back and surfaces a toast.
    onClose();
  };

  const submitting = createStudent.isPending || updateStudent.isPending;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('students.editTitle') : t('students.createTitle')}
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
          error={errors.middleName}
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
        <Input
          label={`${t('fields.birthDate')} (${t('form.optional')})`}
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          error={errors.birthDate}
          max={today}
          disabled={submitting}
        />
        <Input
          label={t('fields.enrollmentDate')}
          type="date"
          value={enrollmentDate}
          onChange={(e) => setEnrollmentDate(e.target.value)}
          error={errors.enrollmentDate}
          min={birthDate || undefined}
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

        {/* Course & enrolment details (rework additions — all optional). A
            selectable empty option lets the user clear the field again on edit. */}
        <Select
          label={`${t('fields.course')} (${t('form.optional')})`}
          value={courseId}
          onChange={(e) => {
            const id = e.target.value;
            setCourseId(id);
            // Auto-fill the course fee with the selected course's monthly price
            // (the field stays editable — the user can override it afterwards).
            const picked = coursesData?.items.find((c) => c.id === id);
            if (picked?.pricePerMonth != null) {
              setCourseFee(String(picked.pricePerMonth));
            }
          }}
          disabled={submitting}
          options={[
            { value: '', label: t('form.notSelected') },
            ...(coursesData?.items ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
        <Select
          label={`${t('fields.level')} (${t('form.optional')})`}
          value={level}
          onChange={(e) => setLevel(e.target.value as StudentLevel | '')}
          disabled={submitting}
          options={[
            { value: '', label: t('form.notSelected') },
            ...STUDENT_LEVELS.map((lvl) => ({
              value: lvl,
              label: t(levelLabelKey(lvl)),
            })),
          ]}
        />
        <Select
          label={`${t('fields.referralSource')} (${t('form.optional')})`}
          value={referralSource}
          onChange={(e) =>
            setReferralSource(e.target.value as ReferralSource | '')
          }
          disabled={submitting}
          options={[
            { value: '', label: t('form.notSelected') },
            ...REFERRAL_SOURCES.map((src) => ({
              value: src,
              label: t(referralLabelKey(src)),
            })),
          ]}
        />
        <Input
          label={`${t('fields.courseFee')} (${t('form.optional')})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={courseFee}
          onChange={(e) => setCourseFee(e.target.value)}
          error={errors.courseFee}
          disabled={submitting}
        />
      </div>

      {/* Explicit parent blocks: father + mother (both optional). */}
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t('students.parents.title')}
        </h3>
        <ParentFigureFields
          legend={t('students.parents.father')}
          value={father}
          onChange={setFather}
          errors={fatherErrors}
          disabled={submitting}
        />
        <ParentFigureFields
          legend={t('students.parents.mother')}
          value={mother}
          onChange={setMother}
          errors={motherErrors}
          disabled={submitting}
        />
      </div>
    </FormModal>
  );
}
