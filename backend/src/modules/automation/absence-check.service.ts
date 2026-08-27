import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceStatus, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  normalizeNotificationLang,
  renderTemplate,
} from '../notifications/notifications.i18n';

/** Template key for the 3-consecutive-absences parent SMS. */
const ABSENCE_TEMPLATE = 'absence_3_lessons';

/** How many consecutive ABSENT lessons trigger the alert. */
const STREAK_LENGTH = 3;

/** Summary of one scan run (returned to the manual-trigger endpoint). */
export interface AbsenceScanResult {
  scannedStudents: number;
  triggered: number;
  notificationsSent: number;
  skippedAlreadyNotified: number;
}

/**
 * Detects students with {@link STREAK_LENGTH} consecutive ABSENT lessons and
 * sends a localized SMS to each of their parents via the
 * {@link NotificationsService}.
 *
 * The streak is evaluated PER GROUP: for each of the student's ACTIVE group
 * memberships we inspect only the attendance rows tied to that group's lessons,
 * in schedule order. A student who is absent in one group but attending another
 * is only alerted for the group where the 3-absence streak actually occurred.
 *
 * Dedup: a (student, group) is only alerted once per streak. We record a
 * Notification (template `absence_3_lessons`) whose payload carries the
 * studentId, groupId and streak anchor (the `startsAt` of the first absent
 * lesson in the streak); on subsequent scans we skip that (student, group) if an
 * alert already exists for the same anchor. As soon as the student attends
 * (PRESENT/LATE) in that group, the streak — and thus the anchor — resets, so a
 * future 3-absence run in the same group alerts again. This satisfies "don't
 * resend until the student attends again in that group".
 *
 * RESILIENCE: the whole scan is wrapped so a single bad student/parent can't
 * abort the run, and delivery goes through NotificationsService which never
 * throws for missing SMS config (records SKIPPED/FAILED instead).
 */
@Injectable()
export class AbsenceCheckService {
  private readonly logger = new Logger(AbsenceCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Daily automated scan (08:00 server time). */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'absence-3-lessons' })
  async handleCron(): Promise<void> {
    try {
      const result = await this.scan();
      this.logger.log(
        `Absence scan: ${result.triggered} student(s) over ${STREAK_LENGTH} absences, ` +
          `${result.notificationsSent} SMS dispatched, ${result.skippedAlreadyNotified} deduped.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Absence scan failed: ${message}`);
    }
  }

  /**
   * Run the scan. Returns a summary; never throws for per-student failures.
   */
  async scan(): Promise<AbsenceScanResult> {
    const result: AbsenceScanResult = {
      scannedStudents: 0,
      triggered: 0,
      notificationsSent: 0,
      skippedAlreadyNotified: 0,
    };

    // Only students that have any attendance records are candidates. Pull the
    // students together with their parents, user language, and active group
    // memberships (the streak is evaluated per group).
    const students = await this.prisma.student.findMany({
      where: { isActive: true, attendances: { some: {} } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { language: true } },
        parents: { select: { phone: true } },
        groupLinks: {
          where: { leftAt: null },
          select: { groupId: true },
        },
      },
    });
    if (students.length === 0) return result;

    const studentIds = students.map((s) => s.id);

    // BATCH 1: every relevant attendance in ONE query (was one per student×
    // group). Ordered newest-first; grouped into a (studentId|groupId) map in
    // memory so each streak window is just the first STREAK_LENGTH entries.
    const attendances = await this.prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        studentId: true,
        status: true,
        lesson: { select: { groupId: true, startsAt: true } },
      },
      orderBy: { lesson: { startsAt: 'desc' } },
    });
    const byStudentGroup = new Map<
      string,
      Array<{ status: AttendanceStatus; startsAt: Date }>
    >();
    for (const a of attendances) {
      if (!a.lesson?.groupId) continue;
      const key = `${a.studentId}|${a.lesson.groupId}`;
      const list = byStudentGroup.get(key) ?? [];
      if (list.length < STREAK_LENGTH) {
        list.push({ status: a.status, startsAt: a.lesson.startsAt });
        byStudentGroup.set(key, list);
      }
    }

    // BATCH 2: all prior alert anchors in ONE query (was 200-row scan + JSON
    // parse per student×group). Deduped into a Set of "student|group|anchor".
    const notifiedKeys = await this.loadNotifiedKeys();

    for (const student of students) {
      result.scannedStudents += 1;
      try {
        for (const link of student.groupLinks) {
          this.processStreak(
            student,
            link.groupId,
            byStudentGroup.get(`${student.id}|${link.groupId}`) ?? [],
            notifiedKeys,
            result,
          );
        }
        await this.flushPending(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Absence check failed for student ${student.id}: ${message}`,
        );
      }
    }

    return result;
  }

  /** Queued SMS dispatches accumulated during the in-memory streak scan. */
  private pending: Array<{
    phone: string;
    text: string;
    studentId: string;
    groupId: string;
    anchorKey: string;
  }> = [];

  private async flushPending(result: AbsenceScanResult): Promise<void> {
    const batch = this.pending;
    this.pending = [];
    for (const p of batch) {
      await this.notifications.dispatch({
        recipient: p.phone,
        channel: NotificationChannel.SMS,
        template: ABSENCE_TEMPLATE,
        text: p.text,
        payload: {
          studentId: p.studentId,
          groupId: p.groupId,
          streakAnchor: p.anchorKey,
        },
      });
      result.notificationsSent += 1;
    }
  }

  /**
   * Evaluate a single (student, group) streak from the pre-fetched attendance
   * window. Pure in-memory — no DB access. Queues SMS into `pending`.
   */
  private processStreak(
    student: {
      id: string;
      firstName: string;
      lastName: string;
      user: { language: string } | null;
      parents: Array<{ phone: string }>;
    },
    groupId: string,
    recent: Array<{ status: AttendanceStatus; startsAt: Date }>,
    notifiedKeys: Set<string>,
    result: AbsenceScanResult,
  ): void {
    // Need at least a full streak of records, all ABSENT.
    if (recent.length < STREAK_LENGTH) return;
    if (!recent.every((a) => a.status === AttendanceStatus.ABSENT)) return;

    // Anchor the streak at its FIRST (oldest) absent lesson in the window.
    const anchorKey = recent[recent.length - 1].startsAt.toISOString();

    if (notifiedKeys.has(`${student.id}|${groupId}|${anchorKey}`)) {
      result.skippedAlreadyNotified += 1;
      return;
    }

    result.triggered += 1;

    const lang = normalizeNotificationLang(student.user?.language);
    const text = renderTemplate(ABSENCE_TEMPLATE, lang, {
      studentName: `${student.firstName} ${student.lastName}`.trim(),
    });

    // Send to every parent with a phone. Record one Notification per parent so
    // the audit trail is complete; dedup checks any of them.
    const phones = student.parents
      .map((p) => (p.phone ?? '').trim())
      .filter((p) => p.length > 0);

    if (phones.length === 0) {
      this.logger.warn(
        `Student ${student.id} hit ${STREAK_LENGTH} absences in group ${groupId} but has no parent phone on file.`,
      );
      return;
    }

    // Mark this anchor so a same-run second group can't double-queue it.
    notifiedKeys.add(`${student.id}|${groupId}|${anchorKey}`);
    for (const phone of phones) {
      this.pending.push({
        phone,
        text,
        studentId: student.id,
        groupId,
        anchorKey,
      });
    }
  }

  /**
   * Load every prior `absence_3_lessons` anchor into a lookup Set in ONE query
   * (was a 200-row scan + JSON parse for each student×group pair). Key format:
   * "studentId|groupId|streakAnchor".
   */
  private async loadNotifiedKeys(): Promise<Set<string>> {
    const prior = await this.prisma.notification.findMany({
      where: { template: ABSENCE_TEMPLATE },
      select: { payload: true },
    });
    const keys = new Set<string>();
    for (const n of prior) {
      if (!n.payload) continue;
      try {
        const parsed: unknown = JSON.parse(n.payload);
        const data =
          parsed && typeof parsed === 'object'
            ? (parsed as { data?: Record<string, unknown> }).data
            : undefined;
        if (data?.studentId && data?.groupId && data?.streakAnchor) {
          keys.add(`${data.studentId}|${data.groupId}|${data.streakAnchor}`);
        }
      } catch {
        // Ignore unparseable payloads.
      }
    }
    return keys;
  }
}
