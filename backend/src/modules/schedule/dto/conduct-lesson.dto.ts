import { IsBoolean } from 'class-validator';

/**
 * Body for PATCH /lessons/:id/conduct — mark the lesson conducted (or revert).
 */
export class ConductLessonDto {
  @IsBoolean()
  isConducted!: boolean;
}
