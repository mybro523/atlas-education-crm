import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import {
  useCreateLesson,
  useUpdateLesson,
  type Lesson,
  type CreateLessonDto,
  type UpdateLessonDto,
} from '@/entities/lesson';
import { useGroups } from '@/entities/group';
import { useTeachers } from '@/entities/teacher';
import { useCourses } from '@/entities/course';
import { useRooms } from '@/entities/room';
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
  /** Filter only — narrows the group list; the lesson's course comes via group. */
  courseId: string;
  groupId: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
}

const EMPTY: FormState = {
  courseId: '',
  groupId: '',
  teacherId: '',
  roomId: '',
  date: '',
  startTime: '',
  endTime: '',
};

/**
 * Create / edit a scheduled lesson (contract §8). There is no topic — a lesson
 * is labelled by its group's course. Date + start/end times combine into ISO
 * `startsAt`/`endsAt`; room is a FK selected from the rooms dictionary. Saving is
 * optimistic via the lesson entity hooks.
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

  // Options. Fetch a generous page so the selects are usable without a picker.
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });
  const { data: roomsData } = useRooms();

  const groups = useMemo(() => groupsData?.items ?? [], [groupsData]);
  const rooms = useMemo(() => roomsData ?? [], [roomsData]);

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
        courseId: lesson.group?.courseId ?? '',
        groupId: lesson.groupId,
        teacherId: lesson.teacherId ?? '',
        roomId: lesson.roomId ?? '',
        date: start.date,
        startTime: start.time,
        endTime: end.time,
      });
    } else {
      const seedGroup = defaultGroupId
        ? groups.find((g) => g.id === defaultGroupId)
        : undefined;
      setForm({
        ...EMPTY,
        courseId: seedGroup?.courseId ?? '',
        groupId: defaultGroupId ?? '',
        teacherId: seedGroup?.teacherId ?? '',
        date: defaultDate ? toDateInput(defaultDate) : '',
      });
    }
  }, [open, lesson, defaultGroupId, defaultDate, groups]);

  const courseOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allCourses') },
      ...(coursesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [coursesData, t],
  );

  const groupOptions = useMemo(
    () =>
      groups
        .filter((g) => !form.courseId || g.courseId === form.courseId)
        .map((g) => ({ value: g.id, label: g.name })),
    [groups, form.courseId],
  );

  const teacherOptions = useMemo(
    () =>
      (teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      })),
    [teachersData],
  );

  const roomOptions = useMemo(() => {
    const opts = rooms
      .filter((r) => r.isActive || r.id === form.roomId)
      .map((r) => ({ value: r.id, label: r.name }));
    return [{ value: '', label: t('schedule.fields.noRoom') }, ...opts];
  }, [rooms, form.roomId, t]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Course change: drop a group that no longer belongs to the chosen course.
  const handleCourseChange = (courseId: string) => {
    setForm((prev) => {
      const group = groups.find((g) => g.id === prev.groupId);
      const keepGroup = !courseId || (group && group.courseId === courseId);
      return { ...prev, courseId, groupId: keepGroup ? prev.groupId : '' };
    });
  };

  // Group change: sync course + default the teacher from the group when empty.
  const handleGroupChange = (groupId: string) => {
    setForm((prev) => {
      const group = groups.find((g) => g.id === groupId);
      return {
        ...prev,
        groupId,
        courseId: group?.courseId ?? prev.courseId,
        teacherId: prev.teacherId || (group?.teacherId ?? ''),
      };
    });
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    // A lesson's course is carried by its group, so requiring the group also
    // enforces the course. Room stays optional (contract §8).
    if (!form.groupId) next.groupId = t('form.required');
    if (!form.date) next.date = t('form.required');
    if (!form.startTime) next.startTime = t('form.required');
    if (!form.endTime) {
      next.endTime = t('form.required');
    } else if (form.startTime && form.endTime <= form.startTime) {
      next.endTime = t('schedule.fields.endAfterStart');
    }
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

    const onError = (error: unknown) => {
      setFormError(extractErrorMessage(error) ?? t('schedule.saveError'));
    };
    const onSuccess = () => {
      onSaved?.();
      onClose();
    };

    if (lesson) {
      // Edit: an empty room clears the assignment (backend disconnects on '').
      const dto: UpdateLessonDto = {
        groupId: form.groupId,
        teacherId: form.teacherId || undefined,
        roomId: form.roomId,
        startsAt,
        endsAt,
      };
      updateLesson.mutate({ id: lesson.id, dto }, { onSuccess, onError });
    } else {
      const dto: CreateLessonDto = {
        groupId: form.groupId,
        teacherId: form.teacherId || undefined,
        roomId: form.roomId || undefined,
        startsAt,
        endsAt,
      };
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
        label={t('schedule.fields.course')}
        placeholder={t('schedule.fields.coursePlaceholder')}
        options={courseOptions}
        value={form.courseId}
        onChange={(e) => handleCourseChange(e.target.value)}
      />

      <Select
        label={t('schedule.fields.group')}
        placeholder={t('schedule.fields.groupPlaceholder')}
        options={groupOptions}
        value={form.groupId}
        onChange={(e) => handleGroupChange(e.target.value)}
        error={errors.groupId}
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
          error={errors.endTime}
        />
      </div>

      <Select
        label={t('schedule.fields.room')}
        options={roomOptions}
        value={form.roomId}
        onChange={(e) => setField('roomId', e.target.value)}
      />

      <Select
        label={t('schedule.fields.teacher')}
        placeholder={t('schedule.fields.teacherPlaceholder')}
        options={teacherOptions}
        value={form.teacherId}
        onChange={(e) => setField('teacherId', e.target.value)}
      />
    </FormModal>
  );
}
