import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
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
import { cn } from '@/shared/lib/cn';
import {
  useConductLesson,
  useDeleteLesson,
  type Lesson,
} from '@/entities/lesson';
import { useGroups } from '@/entities/group';
import { useTeachers } from '@/entities/teacher';
import { useCourses } from '@/entities/course';
import { useRooms } from '@/entities/room';
import {
  LessonFormModal,
  useScheduleLessons,
  buildWeek,
  buildDay,
  buildMonthGrid,
  addWeeks,
  addDays,
  addMonths,
  toDateInput,
  resolveLessonView,
  WEEKDAY_KEYS,
  type LessonLookups,
} from '@/features/schedule-editor';
import {
  useCanCrudGroups,
  useManageableGroupPredicate,
} from '@/features/manage-group-students';
import { WeekGrid } from './ui/WeekGrid';
import { MonthGrid } from './ui/MonthGrid';
import { DayView } from './ui/DayView';
import { RoomOccupancyPanel } from './ui/RoomOccupancyPanel';

type ScheduleView = 'month' | 'week' | 'day';
const VIEWS: ScheduleView[] = ['month', 'week', 'day'];

export function SchedulePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCrud = useCanCrudGroups();
  const canManageGroup = useManageableGroupPredicate();
  const conductLesson = useConductLesson();
  const deleteLesson = useDeleteLesson();

  const [ref, setRef] = useState(() => new Date());
  const [occupancyOpen, setOccupancyOpen] = useState(false);

  const viewParam = searchParams.get('view');
  const view: ScheduleView =
    viewParam === 'week' || viewParam === 'day' ? viewParam : 'month';

  const courseId = searchParams.get('courseId') ?? '';
  const teacherId = searchParams.get('teacherId') ?? '';
  const roomId = searchParams.get('roomId') ?? '';

  const setParam = (key: string, value: string) => {
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

  // Visible range for each view (all expose fromIso/toIso).
  const monthGrid = useMemo(() => buildMonthGrid(ref), [ref]);
  const week = useMemo(() => buildWeek(ref), [ref]);
  const day = useMemo(() => buildDay(ref), [ref]);
  const range = view === 'month' ? monthGrid : view === 'week' ? week : day;

  // Lessons across the visible window (paged through, then bucketed by day).
  const { data, isLoading, isError, isFetching } = useScheduleLessons({
    from: range.fromIso,
    to: range.toIso,
    courseId: courseId || undefined,
    teacherId: teacherId || undefined,
    roomId: roomId || undefined,
  });
  const lessons = useMemo(() => data ?? [], [data]);

  // Lookups + labels for filters and optimistic rows.
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });
  const { data: roomsData } = useRooms();

  const lookups = useMemo<LessonLookups>(
    () => ({
      coursesById: new Map((coursesData?.items ?? []).map((c) => [c.id, c])),
      groupsById: new Map((groupsData?.items ?? []).map((g) => [g.id, g])),
      teachersById: new Map((teachersData?.items ?? []).map((te) => [te.id, te])),
      roomsById: new Map((roomsData ?? []).map((r) => [r.id, r])),
    }),
    [coursesData, groupsData, teachersData, roomsData],
  );
  const resolve = useMemo(
    () => (lesson: Lesson) => resolveLessonView(lesson, lookups),
    [lookups],
  );

  const courseOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allCourses') },
      ...(coursesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [coursesData, t],
  );
  const teacherOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allTeachers') },
      ...(teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      })),
    ],
    [teachersData, t],
  );
  const roomOptions = useMemo(
    () => [
      { value: '', label: t('schedule.allRooms') },
      ...(roomsData ?? [])
        .filter((r) => r.isActive || r.id === roomId)
        .map((r) => ({ value: r.id, label: r.name })),
    ],
    [roomsData, roomId, t],
  );

  // Bucket lessons by local calendar day (already sorted by start).
  const lessonsByDate = useMemo(() => {
    const sorted = [...lessons].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const map = new Map<string, Lesson[]>();
    for (const lesson of sorted) {
      const key = toDateInput(new Date(lesson.startsAt));
      const bucket = map.get(key);
      if (bucket) bucket.push(lesson);
      else map.set(key, [lesson]);
    }
    return map;
  }, [lessons]);

  const weekLessonsByDay = useMemo(
    () => week.days.map((d) => lessonsByDate.get(toDateInput(d)) ?? []),
    [week, lessonsByDate],
  );
  const dayLessons = useMemo(
    () => lessonsByDate.get(toDateInput(day.day)) ?? [],
    [day, lessonsByDate],
  );

  // ---- Lesson form + mutations ---------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [deleting, setDeleting] = useState<Lesson | null>(null);

  const openCreate = (date?: Date) => {
    setEditing(null);
    setCreateDate(date);
    setFormOpen(true);
  };
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setFormOpen(true);
  };

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

  const selectDay = (date: Date) => {
    setRef(date);
    setParam('view', 'day');
  };

  // ---- Navigation label + stepping -----------------------------------------
  const periodLabel = useMemo(() => {
    if (view === 'month') {
      return ref.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    }
    if (view === 'day') {
      return ref.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      });
    }
    return t('schedule.weekOf', {
      date: week.days[0].toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
      }),
    });
  }, [view, ref, week, t]);

  const step = (dir: -1 | 1) => {
    setRef((r) =>
      view === 'month'
        ? addMonths(r, dir)
        : view === 'week'
          ? addWeeks(r, dir)
          : addDays(r, dir),
    );
  };

  const canManageLesson = (lesson: Lesson) => canManageGroup(lesson.groupId);

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

      {/* View switcher + navigation */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
          role="tablist"
          aria-label={t('schedule.viewLabel')}
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setParam('view', v)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground-muted hover:text-foreground',
              )}
            >
              {t(`schedule.views.${v}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('schedule.prevPeriod')}
            onClick={() => step(-1)}
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
            aria-label={t('schedule.nextPeriod')}
            onClick={() => step(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-medium capitalize text-foreground">
            {periodLabel}
          </span>
        </div>
      </div>

      {/* Filters + occupancy toggle */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
          <Select
            options={courseOptions}
            value={courseId}
            onChange={(e) => setParam('courseId', e.target.value)}
            aria-label={t('schedule.fields.course')}
            className="sm:min-w-44"
          />
          <Select
            options={teacherOptions}
            value={teacherId}
            onChange={(e) => setParam('teacherId', e.target.value)}
            aria-label={t('schedule.fields.teacher')}
            className="sm:min-w-44"
          />
          <Select
            options={roomOptions}
            value={roomId}
            onChange={(e) => setParam('roomId', e.target.value)}
            aria-label={t('schedule.fields.room')}
            className="sm:min-w-44"
          />
        </div>

        <Button
          type="button"
          variant={occupancyOpen ? 'secondary' : 'outline'}
          size="sm"
          aria-pressed={occupancyOpen}
          onClick={() => setOccupancyOpen((o) => !o)}
        >
          <DoorOpen className="h-4 w-4" />
          {t('schedule.occupancy.toggle')}
        </Button>
      </div>

      {occupancyOpen && (
        <div className="mb-4">
          <RoomOccupancyPanel initialDate={view === 'day' ? day.day : ref} />
        </div>
      )}

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
      ) : (
        <div
          className={cn(
            'transition-opacity',
            isFetching && 'opacity-60',
          )}
        >
          {view === 'month' && (
            <MonthGrid
              grid={monthGrid}
              weekdayKeys={WEEKDAY_KEYS}
              lessonsByDate={lessonsByDate}
              resolve={resolve}
              canCrud={canCrud}
              canManageLesson={canManageLesson}
              onAddForDay={openCreate}
              onSelectDay={selectDay}
              onEditLesson={openEdit}
              onConductLesson={handleConduct}
              onDeleteLesson={setDeleting}
            />
          )}
          {view === 'week' && (
            <WeekGrid
              week={week}
              weekdayKeys={WEEKDAY_KEYS}
              lessonsByDay={weekLessonsByDay}
              resolve={resolve}
              canCrud={canCrud}
              canManageLesson={canManageLesson}
              onAddForDay={openCreate}
              onEditLesson={openEdit}
              onConductLesson={handleConduct}
              onDeleteLesson={setDeleting}
            />
          )}
          {view === 'day' && (
            <DayView
              day={day.day}
              lessons={dayLessons}
              resolve={resolve}
              canCrud={canCrud}
              canManageLesson={canManageLesson}
              onAddForDay={openCreate}
              onEditLesson={openEdit}
              onConductLesson={handleConduct}
              onDeleteLesson={setDeleting}
            />
          )}
        </div>
      )}

      <LessonFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lesson={editing}
        defaultDate={createDate}
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
