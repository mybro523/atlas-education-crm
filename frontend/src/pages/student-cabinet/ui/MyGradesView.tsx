import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap } from 'lucide-react';

import { Badge, Card, EmptyState, Spinner } from '@/shared/ui';
import { useMyGrades, useMyPerformance, type MyGrade } from '@/entities/me';
import { formatAverage, formatDate, gradeVariant } from '@/features/view-performance';

interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  grades: MyGrade[];
}

/**
 * "My grades" — the student's marks grouped by subject (a per-subject journal
 * row of grade chips), each chip carrying its date and optional teacher comment.
 * Per-subject average and absence flags are surfaced from the performance data.
 */
export function MyGradesView() {
  const { t } = useTranslation();
  const { data: grades, isLoading, isError } = useMyGrades();
  const { data: performance } = useMyPerformance();

  // Map subjectId -> { absences, average } for the header badges.
  const perfBySubject = useMemo(() => {
    const map = new Map<
      string,
      { absences: number; average: number }
    >();
    for (const row of performance?.bySubject ?? []) {
      map.set(row.subjectId, {
        absences: row.absences,
        average: row.averageGrade,
      });
    }
    return map;
  }, [performance]);

  // Group grades by subject, preserving newest-first order within each subject.
  const groups = useMemo<SubjectGroup[]>(() => {
    const bySubject = new Map<string, SubjectGroup>();
    for (const grade of grades ?? []) {
      const subject = grade.lesson.group.subject;
      let group = bySubject.get(subject.id);
      if (!group) {
        group = { subjectId: subject.id, subjectName: subject.name, grades: [] };
        bySubject.set(subject.id, group);
      }
      group.grades.push(grade);
    }
    return [...bySubject.values()].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    );
  }, [grades]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <Card flush>
        <EmptyState
          title={t('studentCabinet.loadError')}
          icon={<GraduationCap className="h-6 w-6" aria-hidden />}
        />
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card flush>
        <EmptyState
          title={t('studentCabinet.grades.empty')}
          description={t('studentCabinet.grades.emptyHint')}
          icon={<GraduationCap className="h-6 w-6" aria-hidden />}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const perf = perfBySubject.get(group.subjectId);
        const absences = perf?.absences ?? 0;
        const average = perf?.average ?? 0;
        return (
          <Card key={group.subjectId} flush className="overflow-hidden">
            {/* Subject header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
                  <BookOpen className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                  {group.subjectName}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="primary">
                  {t('studentCabinet.grades.avgShort', {
                    value: formatAverage(average),
                  })}
                </Badge>
                {absences > 0 && (
                  <Badge variant="danger" dot>
                    {t('studentCabinet.grades.absencesShort', {
                      count: absences,
                    })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Journal of marks (grade chips) */}
            <ul className="flex flex-wrap gap-2 p-4">
              {group.grades.map((grade) => (
                <li key={grade.id}>
                  <span
                    className="inline-flex flex-col items-center gap-0.5"
                    title={
                      grade.comment
                        ? `${formatDate(grade.createdAt)} · ${grade.comment}`
                        : formatDate(grade.createdAt)
                    }
                  >
                    <Badge
                      variant={gradeVariant(grade.value)}
                      className="min-w-[2rem] justify-center text-sm"
                    >
                      {grade.value}
                    </Badge>
                    <span className="text-[10px] leading-none text-foreground-muted">
                      {formatDate(grade.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
