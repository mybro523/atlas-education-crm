import type { CreateParentDto } from '@/entities/student';

/**
 * A parent row as edited in the UI. In "create" mode parents have no server id
 * yet, so we tag each draft with a local `_localId` for stable React keys and
 * in-place edits before the student (and its parents) are persisted.
 */
export interface ParentDraft extends CreateParentDto {
  /** Local-only key for draft rows (create mode). */
  _localId: string;
  /** Server id once persisted (edit mode). */
  id?: string;
}
