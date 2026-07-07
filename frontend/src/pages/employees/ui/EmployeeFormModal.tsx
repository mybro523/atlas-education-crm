import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, useToast } from '@/shared/ui';
import {
  isValidEmail,
  isValidPersonName,
  sanitizePersonName,
} from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useCreateEmployee,
  type CreateEmployeeDto,
  type StaffRole,
} from '@/entities/staff';
import { PasswordField } from './PasswordField';
import type { IssuedCredentials } from './CredentialsModal';

/** Roles the founder can hand out (FOUNDER itself is never created here). */
const ASSIGNABLE_ROLES = ['ADMIN', 'SALES_MANAGER', 'TEACHER'] as const;

type AssignableRole = Exclude<StaffRole, 'FOUNDER'>;

interface FieldErrors {
  lastName?: string;
  firstName?: string;
  role?: string;
  branchId?: string;
  email?: string;
  password?: string;
}

export interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after the server confirms creation — opens the credentials modal. */
  onCreated: (credentials: IssuedCredentials) => void;
}

/**
 * Create a staff account (ADMIN / SALES_MANAGER / TEACHER) with login +
 * password. Branch is mandatory for teachers (their profile lives in a
 * branch); position is a free-text label for non-teaching staff. The modal
 * closes INSTANTLY on submit (optimistic row appears in the table); once the
 * server confirms, the page shows the issued credentials for copying.
 */
export function EmployeeFormModal({
  open,
  onClose,
  onCreated,
}: EmployeeFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: branches } = useBranches();
  const createEmployee = useCreateEmployee();

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<'' | AssignableRole>('');
  const [branchId, setBranchId] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setLastName('');
    setFirstName('');
    setRole('');
    setBranchId('');
    setPosition('');
    setEmail('');
    setPassword('');
    setErrors({});
  }, [open]);

  const isTeacher = role === 'TEACHER';

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    else if (!isValidPersonName(lastName)) next.lastName = t('form.invalidName');
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    else if (!isValidPersonName(firstName))
      next.firstName = t('form.invalidName');
    if (!role) next.role = t('form.requiredField');
    // A teacher account must be attached to a branch.
    if (isTeacher && !branchId) next.branchId = t('form.requiredField');
    if (!email.trim()) next.email = t('form.requiredField');
    else if (!isValidEmail(email)) next.email = t('form.invalidEmail');
    if (password.length < 4) next.password = t('form.passwordMin');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate() || !role) return;

    const dto: CreateEmployeeDto = {
      email: email.trim(),
      password,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      position: !isTeacher && position.trim() ? position.trim() : undefined,
      branchId: branchId || undefined,
    };

    createEmployee.mutate(dto, {
      onSuccess: (created) => {
        toast.success(t('employees.created'));
        onCreated({ email: created.email ?? dto.email, password: dto.password });
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.createError')),
    });
    // Optimistic pattern: close immediately, the table row appears at once.
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('employees.createTitle')}
      onSubmit={handleSubmit}
      submitting={createEmployee.isPending}
      className="max-w-2xl"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(sanitizePersonName(e.target.value))}
          error={errors.lastName}
          maxLength={100}
          autoFocus
        />
        <Input
          label={t('fields.firstName')}
          value={firstName}
          onChange={(e) => setFirstName(sanitizePersonName(e.target.value))}
          error={errors.firstName}
          maxLength={100}
        />
        <Select
          label={t('employees.role')}
          value={role}
          onChange={(e) => setRole(e.target.value as '' | AssignableRole)}
          placeholder={t('form.notSelected')}
          error={errors.role}
          options={ASSIGNABLE_ROLES.map((r) => ({
            value: r,
            label: t(`roles.${r}`),
          }))}
        />
        <Select
          label={
            isTeacher
              ? t('fields.branch')
              : `${t('fields.branch')} (${t('form.optional')})`
          }
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          error={errors.branchId}
          options={[
            ...(isTeacher ? [] : [{ value: '', label: t('form.notSelected') }]),
            ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
          ]}
          placeholder={isTeacher ? t('form.notSelected') : undefined}
        />
        {!isTeacher && (
          <Input
            label={`${t('fields.position')} (${t('form.optional')})`}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            maxLength={120}
          />
        )}
        <Input
          label={t('fields.login')}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="name@atlas.tj"
          maxLength={120}
        />
        <div className={isTeacher ? 'sm:col-span-2' : undefined}>
          <PasswordField
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
        </div>
      </div>
    </FormModal>
  );
}
