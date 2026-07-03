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
    // students together with their parents, user language, and recent
    // attendance (ordered oldest→newest so we can inspect the tail).
    const students = await this.prisma.student.findMany({
      where: { isActive: true, attendances: { some: {} } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { language: true } },
        parents: { select: { phone: true } },
        // Active group memberships — the streak is evaluated per group.
        groupLinks: {
          where: { leftAt: null },
          select: { groupId: true },
        },
      },
    });

    for (const student of students) {
      result.scannedStudents += 1;
      try {
        await this.processStudent(student, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Absence check failed for student ${student.id}: ${message}`,
        );
      }
    }

    return result;
  }

  private async processStudent(
    student: {
      id: string;
      firstName: string;
      lastName: string;
      user: { language: string } | null;
      parents: Array<{ phone: string }>;
      groupLinks: Array<{ groupId: string }>;
    },
    result: AbsenceScanResult,
  ): Promise<void> {
    // Evaluate the streak independently for each ACTIVE group membership so an
    // absence in one group doesn't leak into another group's schedule window.
    for (const link of student.groupLinks) {
      await this.processStudentGroup(student, link.groupId, result);
    }
  }

  /**
   * Evaluate the last {@link STREAK_LENGTH} attendance records for this student
   * SCOPED to a single group's lessons, in schedule order. If all are ABSENT and
   * not yet notified, dispatch the parent SMS for that (student, group) streak.
   */
  private async processStudentGroup(
    student: {
      id: string;
      firstName: string;
      lastName: string;
      user: { language: string } | null;
      parents: Array<{ phone: string }>;
    },
    groupId: string,
    result: AbsenceScanResult,
  ): Promise<void> {
    // Last N attendance records for THIS group's lessons, by schedule order
    // (newest first).
    const recent = await this.prisma.attendance.findMany({
      where: { studentId: student.id, lesson: { groupId } },
      select: { status: true, lesson: { select: { startsAt: true } } },
      orderBy: { lesson: { startsAt: 'desc' } },
      take: STREAK_LENGTH,
    });

    // Need at least a full streak of records, all ABSENT.
    if (recent.length < STREAK_LENGTH) {
      return;
    }
    if (!recent.every((a) => a.status === AttendanceStatus.ABSENT)) {
      return;
    }

    // Anchor the streak at its FIRST (oldest) absent lesson in the window.
    const anchor = recent[recent.length - 1].lesson.startsAt;
    const anchorKey = anchor.toISOString();

    if (await this.alreadyNotified(student.id, groupId, anchorKey)) {
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

    for (const phone of phones) {
      await this.notifications.dispatch({
        recipient: phone,
        channel: NotificationChannel.SMS,
        template: ABSENCE_TEMPLATE,
        text,
        payload: {
          studentId: student.id,
          groupId,
          streakAnchor: anchorKey,
        },
      });
      result.notificationsSent += 1;
    }
  }

  /**
   * Has this student already been alerted for the (group) streak anchored at
   * `anchorKey`? We look at recent `absence_3_lessons` notifications and match
   * the studentId + groupId + streakAnchor we stored in the payload.
   */
  private async alreadyNotified(
    studentId: string,
    groupId: string,
    anchorKey: string,
  ): Promise<boolean> {
    const prior = await this.prisma.notification.findMany({
      where: { template: ABSENCE_TEMPLATE },
      select: { payload: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const n of prior) {
      if (!n.payload) {
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(n.payload);
        const data =
          parsed && typeof parsed === 'object'
            ? (parsed as { data?: Record<string, unknown> }).data
            : undefined;
        if (
          data &&
          data.studentId === studentId &&
          data.groupId === groupId &&
          data.streakAnchor === anchorKey
        ) {
          return true;
        }
      } catch {
        // Ignore unparseable payloads.
      }
    }
    return false;
  }
}
