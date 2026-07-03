import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

import {
  PageHeader,
  Button,
  Select,
  Spinner,
  EmptyState,
  ConfirmDialog,
  useToast,
} from '@/shared/ui';
import {
  useLessons,
  useConductLesson,
  useDeleteLesson,
  type Lesson,
} from '@/entities/lesson';
import { useGroups } from '@/entities/group';
import { useTeachers } from '@/entities/teacher';
import {
  LessonFormModal,
  buildWeek,
  addWeeks,
  isSameDay,
  WEEKDAY_KEYS,
} from '@/features/schedule-editor';
import {
  useCanCrudGroups,
  useManageableGroupPredicate,
} from '@/features/manage-group-students';
import { WeekGrid } from './ui/WeekGrid';

export function SchedulePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCrud = useCanCrudGroups();
  const canManageGroup = useManageableGroupPredicate();
  const conductLesson = useConductLesson();
  const deleteLesson = useDeleteLesson();

  const [ref, setRef] = useState(() => new Date());
  const week = useMemo(() => buildWeek(ref), [ref]);

  const groupId = searchParams.get('groupId') ?? '';
  const teacherId = searchParams.get('teacherId') ?? '';

  const setFilter = (key: 'groupId' | 'teacherId', value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const { data, isLoading, isError } = useLessons({
    from: week.fromIso,
    to: week.toIso,
    groupId: groupId || undefined,
    teacherId: teacherId || undefined,
    pageSize: 100,
  });

  const { data: groupsData } = useGroups({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });

  const lessons = useMemo(() => data?.items ?? [], [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    date?: Date;
    groupId?: string;
  }>({});

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allGroups') },
      ...((groupsData?.items ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      }))),
    ],
    [groupsData, t],
  );
  const teacherOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allTeachers') },
      ...((teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      }))),
    ],
    [teachersData, t],
  );

  // Group lessons by weekday index (0=Mon..6=Sun).
  const lessonsByDay = useMemo(() => {
    const buckets: Lesson[][] = [[], [], [], [], [], [], []];
    for (const lesson of lessons) {
      const start = new Date(lesson.startsAt);
      const idx = week.days.findIndex((d) => isSameDay(d, start));
      if (idx >= 0) buckets[idx].push(lesson);
    }
    for (const bucket of buckets) {
      bucket.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return buckets;
  }, [lessons, week]);

  const openCreate = (date?: Date) => {
    setEditing(null);
    setCreateDefaults({ date, groupId: groupId || undefined });
    setFormOpen(true);
  };
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setFormOpen(true);
  };

  const [deleting, setDeleting] = useState<Lesson | null>(null);

  const handleConduct = (lesson: Lesson) => {
    const next = !lesson.isConducted;
    conductLesson.mutate(
      { id: lesson.id, dto: { isConducted: next } },
      {
        onSuccess: () =>
          toast.success(
            next
              ? t('schedule.conductedToast')
              : t('schedule.notConductedToast'),
          ),
        onError: () => toast.error(t('schedule.saveError')),
      },
    );
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteLesson.mutate(deleting.id, {
      onSuccess: () => toast.success(t('schedule.deletedToast')),
      onError: () => toast.error(t('schedule.saveError')),
    });
    setDeleting(null);
  };

  const weekLabel = week.days[0].toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.subtitle')}
        actions={
          canCrud ? (
            <Button type="button" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              {t('schedule.create')}
            </Button>
          ) : undefined
        }
      />

      {/* Week navigation + filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('schedule.prevWeek')}
            onClick={() => setRef((r) => addWeeks(r, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRef(new Date())}
          >
            {t('schedule.today')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('schedule.nextWeek')}
            onClick={() => setRef((r) => addWeeks(r, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-medium text-foreground">
            {t('schedule.weekOf', { date: weekLabel })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
          <Select
            options={groupOptions}
            value={groupId}
            onChange={(e) => setFilter('groupId', e.target.value)}
            aria-label={t('schedule.fields.group')}
            className="sm:min-w-48"
          />
          <Select
            options={teacherOptions}
            value={teacherId}
            onChange={(e) => setFilter('teacherId', e.target.value)}
            aria-label={t('schedule.fields.teacher')}
            className="sm:min-w-48"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('form.loadError')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('schedule.empty')}
            description={t('schedule.emptyHint')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
            action={
              canCrud ? (
                <Button type="button" size="sm" onClick={() => openCreate()}>
                  <Plus className="h-4 w-4" />
                  {t('schedule.create')}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <WeekGrid
          week={week}
          weekdayKeys={WEEKDAY_KEYS}
          lessonsByDay={lessonsByDay}
          canCrud={canCrud}
          canManageLesson={(lesson) => canManageGroup(lesson.groupId)}
          onAddForDay={openCreate}
          onEditLesson={openEdit}
          onConductLesson={handleConduct}
          onDeleteLesson={setDeleting}
        />
      )}

      <LessonFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lesson={editing}
        defaultGroupId={createDefaults.groupId}
        defaultDate={createDefaults.date}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={t('schedule.deleteTitle')}
        description={t('schedule.deleteConfirm')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
