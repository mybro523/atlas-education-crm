import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import {
  useCreateLesson,
  useUpdateLesson,
  type Lesson,
  type CreateLessonDto,
} from '@/entities/lesson';
import { useGroups, type Group } from '@/entities/group';
import { useTeachers } from '@/entities/teacher';
import { combineToIso, fromIso, toDateInput } from '../model/datetime';

export interface LessonFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the form edits this lesson; otherwise it creates a new one. */
  lesson?: Lesson | null;
  /** Preselected group + default date for the create flow (from a grid cell). */
  defaultGroupId?: string;
  defaultDate?: Date;
  onSaved?: () => void;
}

interface FormState {
  groupId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  room: string;
}

const EMPTY: FormState = {
  groupId: '',
  teacherId: '',
  date: '',
  startTime: '',
  endTime: '',
  topic: '',
  room: '',
};

/**
 * Create / edit a scheduled lesson (contract §8). Date + start/end time fields
 * are combined into ISO `startsAt`/`endsAt`. Saving is optimistic via the
 * lesson entity hooks.
 */
export function LessonFormModal({
  open,
  onClose,
  lesson,
  defaultGroupId,
  defaultDate,
  onSaved,
}: LessonFormModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(lesson);

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const submitting = createLesson.isPending || updateLesson.isPending;

  // Options. Fetch a generous page so selects are usable without a picker.
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever the modal opens or the target lesson changes.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    if (lesson) {
      const start = fromIso(lesson.startsAt);
      const end = fromIso(lesson.endsAt);
      setForm({
        groupId: lesson.groupId,
        teacherId: lesson.teacherId ?? '',
        date: start.date,
        startTime: start.time,
        endTime: end.time,
        topic: lesson.topic ?? '',
        room: lesson.room ?? '',
      });
    } else {
      setForm({
        ...EMPTY,
        groupId: defaultGroupId ?? '',
        date: defaultDate ? toDateInput(defaultDate) : '',
      });
    }
  }, [open, lesson, defaultGroupId, defaultDate]);

  const groupOptions = useMemo(
    () =>
      (groupsData?.items ?? []).map((g: Group) => ({
        value: g.id,
        label: g.name,
      })),
    [groupsData],
  );
  const teacherOptions = useMemo(
    () =>
      (teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      })),
    [teachersData],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.groupId) next.groupId = t('form.required');
    if (!form.date) next.date = t('form.required');
    if (!form.startTime) next.startTime = t('form.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const startsAt = combineToIso(form.date, form.startTime);
    const endsAt = form.endTime
      ? combineToIso(form.date, form.endTime)
      : undefined;

    const dto: CreateLessonDto = {
      groupId: form.groupId,
      teacherId: form.teacherId || undefined,
      startsAt,
      endsAt,
      topic: form.topic.trim() || undefined,
      room: form.room.trim() || undefined,
    };

    const onError = (error: unknown) => {
      setFormError(extractErrorMessage(error) ?? t('schedule.saveError'));
    };
    const onSuccess = () => {
      onSaved?.();
      onClose();
    };

    if (lesson) {
      updateLesson.mutate({ id: lesson.id, dto }, { onSuccess, onError });
    } else {
      createLesson.mutate(dto, { onSuccess, onError });
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('schedule.editTitle') : t('schedule.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={formError ?? undefined}
    >
      <Select
        label={t('schedule.fields.group')}
        placeholder={t('schedule.fields.groupPlaceholder')}
        options={groupOptions}
        value={form.groupId}
        onChange={(e) => setField('groupId', e.target.value)}
        error={errors.groupId}
      />

      <Select
        label={t('schedule.fields.teacher')}
        placeholder={t('schedule.fields.teacherPlaceholder')}
        options={teacherOptions}
        value={form.teacherId}
        onChange={(e) => setField('teacherId', e.target.value)}
      />

      <Input
        type="date"
        label={t('schedule.fields.date')}
        value={form.date}
        onChange={(e) => setField('date', e.target.value)}
        error={errors.date}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="time"
          label={t('schedule.fields.startTime')}
          value={form.startTime}
          onChange={(e) => setField('startTime', e.target.value)}
          error={errors.startTime}
        />
        <Input
          type="time"
          label={t('schedule.fields.endTime')}
          value={form.endTime}
          onChange={(e) => setField('endTime', e.target.value)}
        />
      </div>

      <Input
        label={t('schedule.fields.topic')}
        placeholder={t('schedule.fields.topicPlaceholder')}
        value={form.topic}
        onChange={(e) => setField('topic', e.target.value)}
      />

      <Input
        label={t('schedule.fields.room')}
        placeholder={t('schedule.fields.roomPlaceholder')}
        value={form.room}
        onChange={(e) => setField('room', e.target.value)}
      />
    </FormModal>
  );
}
