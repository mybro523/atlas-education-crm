import type { ReferralSource, StudentLevel } from '@/entities/student';

/**
 * Display-ordered option lists + i18n key helpers for the student enums added in
 * the backend rework (learning level + referral source). Shared by the student
 * form (select options) and the read-only detail card (localized labels) so the
 * two never drift apart. The label keys are added by the Build phase to every
 * locale (ru / tj / en).
 */

/** Learning levels in display order (backend enum StudentLevel). */
export const STUDENT_LEVELS: readonly StudentLevel[] = [
  'BEGINNER',
  'STANDARD',
  'ADVANCED',
];

/** Referral sources in display order (backend enum ReferralSource). */
export const REFERRAL_SOURCES: readonly ReferralSource[] = [
  'INSTAGRAM',
  'FRIENDS',
  'ADS',
  'SELF',
  'OTHER',
];

/** i18n key for a learning-level label, e.g. `students.level.BEGINNER`. */
export const levelLabelKey = (level: StudentLevel): string =>
  `students.level.${level}`;

/** i18n key for a referral-source label, e.g. `students.referral.INSTAGRAM`. */
export const referralLabelKey = (source: ReferralSource): string =>
  `students.referral.${source}`;
