import type { Parent, ParentFigureDto } from '@/entities/student';

/**
 * A single father / mother block as edited in the student form. The FATHER /
 * MOTHER relation is implied by which slot the block occupies, so it is not part
 * of the draft. All fields are plain strings (empty when untouched) and mapped
 * to a {@link ParentFigureDto} on submit. `position` (должность) and `workplace`
 * both participate in student search.
 */
export interface ParentFigureDraft {
  firstName: string;
  lastName: string;
  phone: string;
  workplace: string;
  position: string;
}

/** Per-field validation messages for a parent block (only the required ones). */
export interface ParentFigureErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** An empty block (nothing entered yet). */
export function emptyParentFigure(): ParentFigureDraft {
  return { firstName: '', lastName: '', phone: '', workplace: '', position: '' };
}

/** Build a block from an existing parent (edit-mode prefill); empty when null. */
export function figureFromParent(parent?: Parent | null): ParentFigureDraft {
  if (!parent) return emptyParentFigure();
  return {
    firstName: parent.firstName ?? '',
    lastName: parent.lastName ?? '',
    phone: parent.phone ?? '',
    workplace: parent.workplace ?? '',
    position: parent.position ?? '',
  };
}

/** True when the user has entered anything in this block. */
export function isParentFigureFilled(figure: ParentFigureDraft): boolean {
  return Boolean(
    figure.firstName.trim() ||
      figure.lastName.trim() ||
      figure.phone.trim() ||
      figure.workplace.trim() ||
      figure.position.trim(),
  );
}

/**
 * Map a block to the DTO slot sent to the API, or `undefined` when the block is
 * empty (so the whole father/mother slot is optional). Callers should validate
 * the required fields (name + phone) before relying on this.
 */
export function parentFigureToDto(
  figure: ParentFigureDraft,
): ParentFigureDto | undefined {
  if (!isParentFigureFilled(figure)) return undefined;
  return {
    firstName: figure.firstName.trim(),
    lastName: figure.lastName.trim(),
    phone: figure.phone.trim(),
    workplace: figure.workplace.trim() || undefined,
    position: figure.position.trim() || undefined,
  };
}
