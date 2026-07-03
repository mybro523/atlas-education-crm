# Atlas CRM — REST API Contract (authoritative)

> **Status:** v1.0 (Design phase). This is the single source of truth for the
> backend REST surface. Every module agent MUST implement its resources exactly
> as specified here. If reality forces a deviation, update THIS file too.

- All routes are prefixed with **`/api`** (global prefix).
- All routes require a valid JWT (global `JwtAuthGuard`) **unless** marked
  `@Public()`. There are no public routes in this document (auth lives in the
  auth module, out of scope here).
- Currency is **TJS**. Money fields are decimals serialized as **strings**
  (Prisma `Decimal`) — controllers may also return `number`; treat as numeric.
- Default language `ru`. Timestamps are ISO-8601 UTC strings.
- IDs are cuid strings.

## 0. Cross-cutting conventions

### 0.1 RBAC wiring (READ THIS FIRST)

`JwtAuthGuard` and `ThrottlerGuard` are the ONLY globally-registered guards
(`app.module.ts`). **`RolesGuard` is NOT global.** Therefore, on every
controller (or handler) that uses `@Roles(...)` you MUST also add
`@UseGuards(RolesGuard)`:

```ts
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.FOUNDER)
@Controller('students')
export class StudentsController {}
```

Role hierarchy is **not** implicit — list every allowed role explicitly. The
current user is injected via `@CurrentUser()` / `@CurrentUser('id')` returning
`{ id, role, branchId, email, phone }`.

**Ownership** (teacher→own groups/lessons, student→own data) is NOT expressed by
`@Roles` and MUST be enforced inside the service by resolving the caller's
linked `Teacher`/`Student` profile from `userId` (throw `ForbiddenException`
on mismatch, `NotFoundException` on missing profile/entity).

### 0.2 Pagination

List endpoints accept `?page` (default `1`, min `1`) and `?pageSize`
(default `20`, min `1`, max `100`) via the shared
`PaginationQueryDto` (`common/dto/pagination.dto.ts`). Paginated responses use
the envelope built by `buildPaginatedResult`:

```json
{
  "items": [ /* T[] */ ],
  "meta": { "total": 137, "page": 1, "pageSize": 20, "pageCount": 7 }
}
```

Non-paginated list endpoints (dictionaries: branches, subjects, course-types,
lesson-rates) return a plain array `T[]`.

### 0.3 Common query filters

- `?branchId=<cuid>` — optional branch tag filter. All authenticated staff may
  read all branches; this only narrows results. Validate as optional cuid.
- `?search=<string>` — resource-specific free-text search (see each resource).

### 0.4 Errors

Standard Nest exceptions → HTTP:
`400` ValidationPipe (whitelist, so unknown body fields are stripped/rejected),
`401` missing/invalid JWT, `403` `ForbiddenException` (role or ownership),
`404` `NotFoundException`, `409` `ConflictException` (unique-constraint clashes,
e.g. duplicate subject name, duplicate payment period).

### 0.5 Billing period rule (used by Payments, Salaries, Analytics)

Tuition is **monthly**, anchored to `Student.enrollmentDate`, NOT the calendar
month. A student enrolled on the 15th has periods `15th → 15th`. Use
`computeBillingPeriod(enrollmentDate, ref?)` from
`common/utils/billing-period.ts` → `{ start, end }` (`end` exclusive). Day
29/30/31 clamps to the last day of shorter months. An elapsed period with no
`PAID` `Payment` row is a **debt**.

### 0.6 Salary computation rule (Salaries)

Teacher salary is **per conducted lesson**. For a period `[from, to]`:
`salary = Σ payRate(lesson)` over the teacher's lessons where
`isConducted = true` and `startsAt ∈ [from, to]`, where
`payRate(lesson) = lesson.teacherPayRate ?? lesson.lessonRate.amount ?? 0`.
Admin staff (`Employee.baseSalary`) is a **fixed** monthly amount (`basis=FIXED`).

---

## 1. Branches  `/api/branches`

Dictionary. Read: any authenticated user. Write: `ADMIN`, `FOUNDER`.

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/branches` | any auth | List all branches (plain array). |
| GET | `/api/branches/:id` | any auth | One branch. |
| POST | `/api/branches` | ADMIN, FOUNDER | Create. |
| PATCH | `/api/branches/:id` | ADMIN, FOUNDER | Update. |
| DELETE | `/api/branches/:id` | ADMIN, FOUNDER | Delete. |

**Create/Update body** (`CreateBranchDto` / `UpdateBranchDto = Partial`):
```ts
name: string;      // @IsString @IsNotEmpty
address?: string;  // @IsOptional @IsString
phone?: string;    // @IsOptional @IsString
```
**Response (Branch):**
```json
{ "id":"c...", "name":"Центр №1", "address":"ул. ...", "phone":"+992...",
  "createdAt":"...", "updatedAt":"..." }
```

---

## 2. Subjects  `/api/subjects`

Dictionary. Read: any auth. Write: `ADMIN`, `FOUNDER`.

| Method | Path | Roles |
|---|---|---|
| GET | `/api/subjects` | any auth |
| GET | `/api/subjects/:id` | any auth |
| POST | `/api/subjects` | ADMIN, FOUNDER |
| PATCH | `/api/subjects/:id` | ADMIN, FOUNDER |
| DELETE | `/api/subjects/:id` | ADMIN, FOUNDER |

**Body:** `{ name: string }` — `@IsString @IsNotEmpty`. `name` is `@unique` →
`409` on duplicate. **Response (Subject):** `{ id, name, createdAt, updatedAt }`.

---

## 3. CourseTypes  `/api/course-types`

Flexible dictionary. Read: any auth. Write: `ADMIN`, `FOUNDER`.

| Method | Path | Roles |
|---|---|---|
| GET | `/api/course-types?active=true` | any auth |
| GET | `/api/course-types/:id` | any auth |
| POST | `/api/course-types` | ADMIN, FOUNDER |
| PATCH | `/api/course-types/:id` | ADMIN, FOUNDER |
| DELETE | `/api/course-types/:id` | ADMIN, FOUNDER |

**Query:** `?active` (optional boolean) — filter by `isActive`.
**Body:**
```ts
name: string;       // @IsString @IsNotEmpty ; @unique → 409
isActive?: boolean; // @IsOptional @IsBoolean (default true)
```
**Response (CourseType):** `{ id, name, isActive, createdAt, updatedAt }`.

---

## 4. Courses  `/api/courses`

Read: any auth. Write: `ADMIN`, `FOUNDER`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/courses` | any auth | Paginated. Filters below. |
| GET | `/api/courses/:id` | any auth | Includes `courseType`, `subject`, `branch`. |
| POST | `/api/courses` | ADMIN, FOUNDER | |
| PATCH | `/api/courses/:id` | ADMIN, FOUNDER | |
| DELETE | `/api/courses/:id` | ADMIN, FOUNDER | |

**GET query:** `page`, `pageSize`, `branchId?`, `courseTypeId?`, `subjectId?`,
`active?` (boolean), `search?` (matches course `name`, case-insensitive).
**Create body (`CreateCourseDto`):**
```ts
name: string;          // @IsString @IsNotEmpty
courseTypeId: string;  // @IsString (cuid) — must exist → 404 otherwise
subjectId: string;     // @IsString (cuid) — must exist → 404
branchId: string;      // @IsString (cuid) — must exist → 404
pricePerMonth: number; // @IsNumber @Min(0)
isActive?: boolean;    // @IsOptional @IsBoolean
```
`UpdateCourseDto = Partial`. **Response (Course):** all scalar fields +
optionally nested `courseType`, `subject`, `branch` on detail GET. Paginated
list returns the envelope.

---

## 5. Teachers  `/api/teachers`

Read: any auth (teacher data visible to staff; teacher self-scope via §10).
Write: `ADMIN`, `FOUNDER`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/teachers` | any auth | Paginated; `search`, `branchId`, `subjectId`. |
| GET | `/api/teachers/:id` | any auth | Includes `subjects[]`, `branch`. |
| POST | `/api/teachers` | ADMIN, FOUNDER | |
| PATCH | `/api/teachers/:id` | ADMIN, FOUNDER | |
| DELETE | `/api/teachers/:id` | ADMIN, FOUNDER | |
| PUT | `/api/teachers/:id/subjects` | ADMIN, FOUNDER | Replace assigned subjects. |

**GET query:** `page`, `pageSize`, `branchId?`, `subjectId?`,
`search?` (matches `firstName` OR `lastName`, case-insensitive).
**Create body (`CreateTeacherDto`):**
```ts
firstName: string;   // @IsString @IsNotEmpty
lastName: string;    // @IsString @IsNotEmpty
middleName?: string; // @IsOptional @IsString
phone?: string;      // @IsOptional @IsString
branchId: string;    // @IsString (cuid) — must exist → 404
subjectIds?: string[]; // @IsOptional @IsArray @IsString({each}) — initial subjects
userId?: string;     // @IsOptional — link to an existing User account
```
`UpdateTeacherDto = Partial` (excluding `subjectIds`; use the subjects endpoint).
**Assign-subjects body (`SetTeacherSubjectsDto`):**
`{ subjectIds: string[] }` — `@IsArray @IsString({ each: true })`. Replaces the
full `TeacherSubject` set (delete-missing + create-new).
**Response (Teacher):** scalars + `subjects: Subject[]` (flattened from
`TeacherSubject`) on detail; `branch` optional.

---

## 6. Students  `/api/students`  (+ nested Parents)

Read: `ADMIN`, `FOUNDER` (full); `TEACHER` may read students **of their own
groups** only (enforce in service). Write: `ADMIN`, `FOUNDER`.
Student self-profile via §9.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/students` | ADMIN, FOUNDER, TEACHER | Paginated; search by name OR parent workplace. |
| GET | `/api/students/:id` | ADMIN, FOUNDER, TEACHER | Includes `parents[]`, `branch`, `groupLinks`. |
| POST | `/api/students` | ADMIN, FOUNDER | Optional nested `parents[]`. |
| PATCH | `/api/students/:id` | ADMIN, FOUNDER | |
| DELETE | `/api/students/:id` | ADMIN, FOUNDER | |
| GET | `/api/students/:id/parents` | ADMIN, FOUNDER, TEACHER | List parents. |
| POST | `/api/students/:id/parents` | ADMIN, FOUNDER | Add parent. |
| PATCH | `/api/students/:id/parents/:parentId` | ADMIN, FOUNDER | Update parent. |
| DELETE | `/api/students/:id/parents/:parentId` | ADMIN, FOUNDER | Remove parent. |

For `TEACHER`, `GET /students` and `/students/:id` are scoped to students who
belong (via `GroupStudent`) to a group the teacher owns; other students → 403.

**GET query:** `page`, `pageSize`, `branchId?`, `groupId?`,
`search?` — **matches `Student.firstName` OR `Student.lastName` OR any
`Parent.workplace`** (case-insensitive, `contains`). This dual search is a hard
requirement (spec §4.4, decision #14).

**Create body (`CreateStudentDto`):**
```ts
firstName: string;      // @IsString @IsNotEmpty
lastName: string;       // @IsString @IsNotEmpty
middleName?: string;    // @IsOptional @IsString
birthDate?: string;     // @IsOptional @IsDateString
phone?: string;         // @IsOptional @IsString
branchId: string;       // @IsString (cuid) — must exist → 404
enrollmentDate?: string;// @IsOptional @IsDateString (default now) — billing anchor
isActive?: boolean;     // @IsOptional @IsBoolean
userId?: string;        // @IsOptional — link to a User account
parents?: CreateParentDto[]; // @IsOptional @IsArray @ValidateNested({each}) @Type
```
**`CreateParentDto`:**
```ts
firstName: string; // @IsString @IsNotEmpty
lastName: string;  // @IsString @IsNotEmpty
phone: string;     // @IsString @IsNotEmpty
workplace?: string;// @IsOptional @IsString  (searchable)
```
`UpdateStudentDto = Partial` (without nested `parents`; manage via parent
sub-routes). `UpdateParentDto = Partial<CreateParentDto>`.
**Response (Student):** scalars + `parents: Parent[]` + `branch?` +
`groupLinks?` on detail.

---

## 7. Groups  `/api/groups`

Read: any auth. Write: `ADMIN`, `FOUNDER`. Add/remove student: `ADMIN`,
`FOUNDER`, and `TEACHER` **for their own groups** (service ownership check).

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/groups` | any auth | Paginated; `branchId`, `courseId`, `teacherId`, `search`(name). |
| GET | `/api/groups/:id` | any auth | Includes `course`, `subject`, `teacher`, counts. |
| POST | `/api/groups` | ADMIN, FOUNDER | |
| PATCH | `/api/groups/:id` | ADMIN, FOUNDER | |
| DELETE | `/api/groups/:id` | ADMIN, FOUNDER | |
| GET | `/api/groups/:id/students` | any auth (TEACHER own) | List active members. |
| POST | `/api/groups/:id/students` | ADMIN, FOUNDER, TEACHER(own) | Add student. |
| DELETE | `/api/groups/:id/students/:studentId` | ADMIN, FOUNDER, TEACHER(own) | Remove (set `leftAt`). |

**Create body (`CreateGroupDto`):**
```ts
name: string;      // @IsString @IsNotEmpty
courseId: string;  // @IsString (cuid) — must exist → 404
subjectId: string; // @IsString (cuid) — must exist → 404
teacherId?: string;// @IsOptional (cuid) — must exist → 404
branchId: string;  // @IsString (cuid) — must exist → 404
isActive?: boolean;// @IsOptional @IsBoolean
```
`UpdateGroupDto = Partial`.
**Add-student body (`AddGroupStudentDto`):** `{ studentId: string }`
(`@IsString`). Creates a `GroupStudent` (`joinedAt=now`, `leftAt=null`).
Re-adding a previously-left student re-opens the link (clear `leftAt`).
Idempotent duplicate active membership → `409`.
**Remove:** sets `leftAt=now` (soft leave); returns `204`/updated link.
**Group members response:** `GroupStudent[]` with nested `student` (id, names,
phone), filtered to `leftAt = null` by default (`?includeLeft=true` to include).

---

## 8. Schedule / Lessons  `/api/lessons`

Read: any auth (teacher/student self-scoped variants in §9/§10). Write:
`ADMIN`, `FOUNDER`; a `TEACHER` may `PATCH` `isConducted` (and topic/room) on
**their own** lessons.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/lessons` | any auth | Paginated; filters `groupId`, `teacherId`, `from`, `to`. |
| GET | `/api/lessons/:id` | any auth | Includes `group`, `teacher`, `lessonRate`. |
| POST | `/api/lessons` | ADMIN, FOUNDER | Create scheduled lesson. |
| PATCH | `/api/lessons/:id` | ADMIN, FOUNDER, TEACHER(own) | Update. |
| DELETE | `/api/lessons/:id` | ADMIN, FOUNDER | |
| PATCH | `/api/lessons/:id/conduct` | ADMIN, FOUNDER, TEACHER(own) | Mark conducted/not. |

**GET query:** `page`, `pageSize`, `groupId?`, `teacherId?`,
`from?` (`@IsDateString`), `to?` (`@IsDateString`) — date-range on `startsAt`.
For a `TEACHER` calling without filters, scope to their own lessons.
**Create body (`CreateLessonDto`):**
```ts
groupId: string;        // @IsString (cuid) — must exist → 404
teacherId?: string;     // @IsOptional (cuid) — defaults to group's teacher
startsAt: string;       // @IsDateString (required)
endsAt?: string;        // @IsOptional @IsDateString
topic?: string;         // @IsOptional @IsString
room?: string;          // @IsOptional @IsString
teacherPayRate?: number;// @IsOptional @IsNumber @Min(0) — per-lesson override
lessonRateId?: string;  // @IsOptional (cuid) — fallback rate
isConducted?: boolean;  // @IsOptional @IsBoolean (default false)
```
`UpdateLessonDto = Partial`.
**Conduct body (`ConductLessonDto`):** `{ isConducted: boolean }`
(`@IsBoolean`). **Response (Lesson):** scalars + nested relations on detail.

---

## 9. Journal  `/api/journal`

Write: `ADMIN`, `FOUNDER`, `TEACHER` (own groups only — resolve teacher from
`userId`, verify the lesson's group belongs to them). Read (matrix): same set.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/journal/groups/:groupId` | ADMIN, FOUNDER, TEACHER(own) | Students × lessons matrix. |
| PUT | `/api/journal/grades` | ADMIN, FOUNDER, TEACHER(own) | Upsert grade. |
| DELETE | `/api/journal/grades/:studentId/:lessonId` | same | Remove grade. |
| PUT | `/api/journal/attendance` | ADMIN, FOUNDER, TEACHER(own) | Upsert attendance. |
| POST | `/api/journal/remarks` | ADMIN, FOUNDER, TEACHER(own) | Create remark. |
| GET | `/api/journal/remarks` | ADMIN, FOUNDER, TEACHER(own) | List (`?studentId`,`?lessonId`,`?groupId`). |
| DELETE | `/api/journal/remarks/:id` | ADMIN, FOUNDER, TEACHER(own) | Remove remark. |

**Grade upsert body (`UpsertGradeDto`):**
```ts
studentId: string; // @IsString (cuid)
lessonId: string;  // @IsString (cuid)
value: number;     // @IsInt @Min(2) @Max(5)   (5-point scale 2..5)
comment?: string;  // @IsOptional @IsString
```
Upsert on `@@unique([studentId, lessonId])`; set `authorId` from
`@CurrentUser('id')`.
**Attendance upsert body (`UpsertAttendanceDto`):**
```ts
studentId: string; // @IsString (cuid)
lessonId: string;  // @IsString (cuid)
status: 'PRESENT' | 'ABSENT' | 'LATE'; // @IsEnum(AttendanceStatus)
```
Upsert on `@@unique([studentId, lessonId])`.
**Remark body (`CreateRemarkDto`):**
```ts
studentId: string; // @IsString (cuid)
lessonId?: string; // @IsOptional (cuid)
text: string;      // @IsString @IsNotEmpty
```
`authorId` from current user.
**Matrix response (`GET journal/groups/:groupId`):**
```json
{
  "group": { "id":"...", "name":"..." },
  "lessons": [ { "id":"...", "startsAt":"...", "topic":"...", "isConducted":true } ],
  "students": [
    {
      "student": { "id":"...", "firstName":"...", "lastName":"..." },
      "cells": {
        "<lessonId>": { "grade": 5, "attendance": "PRESENT", "remarks": 0 }
      }
    }
  ]
}
```
Ownership: if caller is `TEACHER`, the group must be theirs (`Group.teacherId`
== caller's teacherId) else `403`.

---

## 10. Student self  `/api/me/student`

Roles: `STUDENT` only, own data. Resolve `Student` from `userId`; if the user
has no student profile → `404`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/me/student/profile` | Own profile + parents + groups (read-only). |
| GET | `/api/me/student/grades` | Own grades (`?subjectId?`, `?from?`, `?to?`), newest first. |
| GET | `/api/me/student/schedule` | Own upcoming/period lessons (`?from?`, `?to?`). |
| GET | `/api/me/student/performance` | Per-subject avg grade + absence counts. |

**Grades item:**
```json
{ "id":"...", "value":5, "comment":null, "createdAt":"...",
  "lesson": { "id":"...", "startsAt":"...", "topic":"...",
              "group": { "id":"...", "name":"...",
                         "subject": { "id":"...", "name":"Математика" } } } }
```
**Schedule item:** lesson with `group`, `subject`, `teacher`, `room`, times.
**Performance response:**
```json
{
  "bySubject": [
    { "subjectId":"...", "subjectName":"Математика",
      "averageGrade": 4.5, "gradesCount": 12,
      "absences": 2, "lates": 1, "present": 20 }
  ],
  "overall": { "averageGrade": 4.4, "totalAbsences": 3 }
}
```
`averageGrade` = mean of `Grade.value` for that subject's lessons;
absence/late/present = counts from `Attendance` on that subject's lessons.

---

## 11. Teacher self  `/api/me/teacher`

Roles: `TEACHER` only, own data. Resolve `Teacher` from `userId`; no profile → `404`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/me/teacher/groups` | Groups where `teacherId == self` (with counts). |
| GET | `/api/me/teacher/students` | Distinct active students across own groups (`?groupId?`, `?search?`). |
| GET | `/api/me/teacher/schedule` | Own lessons (`?from?`, `?to?`). |

**Students item** includes `phone` and parents' `phone` (teachers may call
students/parents per spec §4.2). **Schedule item:** lesson + group + subject +
room + times.

---

## 12. Payments  `/api/payments`  (FOUNDER only)

`@Roles(Role.FOUNDER)` on the whole controller.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/payments` | Paginated; `status?`, `branchId?`, `studentId?`, `groupId?`, `from?`, `to?`. |
| GET | `/api/payments/:id` | One payment (+ student, group). |
| POST | `/api/payments/generate` | Generate current-period payment(s) from enrollmentDate. |
| PATCH | `/api/payments/:id/pay` | Mark `PAID` (`paidAt=now`). |
| PATCH | `/api/payments/:id` | Edit amount/status. |
| DELETE | `/api/payments/:id` | Delete. |
| GET | `/api/payments/debts` | Debts report (unpaid elapsed periods). |

**GET query:** pagination + `status?` (`@IsEnum(PaymentStatus)`), `branchId?`,
`studentId?`, `groupId?`, `from?`/`to?` (`@IsDateString`, filter on
`billingMonthStart`).
**Generate body (`GeneratePaymentDto`):**
```ts
studentId?: string; // @IsOptional (cuid) — one student; omit to run for all active
groupId?: string;   // @IsOptional (cuid) — restrict to a group
ref?: string;       // @IsOptional @IsDateString — reference date (default now)
```
For each targeted (student, group) with `pricePerMonth` known, compute the
period via `computeBillingPeriod(enrollmentDate, ref)` and **upsert** a
`Payment` on `@@unique([studentId, groupId, billingMonthStart])` with
`amount = course.pricePerMonth`, `status = UNPAID`, `branchId = student.branchId`.
Returns the created/existing payments.
**Pay body:** none (or `{ paidAt?: string }`); sets `status=PAID`,
`paidAt = body.paidAt ?? now`.
**`/payments/debts` query:** `branchId?`, `studentId?`, `asOf?`(`@IsDateString`).
**Debts response:**
```json
{
  "totalDebt": 3450.00,
  "byStudent": [
    { "studentId":"...", "studentName":"...", "branchId":"...",
      "unpaidPeriods": 2, "amountDue": 700.00,
      "payments": [ { "id":"...", "billingMonthStart":"...",
                      "billingMonthEnd":"...", "amount":350.00 } ] }
  ]
}
```
Debt = `UNPAID` payments whose `billingMonthEnd <= asOf` (period elapsed).
**Response (Payment):** scalar fields + optional nested `student`, `group`.

---

## 13. Finance records  `/api/finance/records`  (FOUNDER only)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/finance/records` | Paginated; `type?`, `branchId?`, `from?`, `to?`, `search?`(category/description). |
| GET | `/api/finance/records/:id` | One. |
| POST | `/api/finance/records` | Create income/expense. |
| PATCH | `/api/finance/records/:id` | Update. |
| DELETE | `/api/finance/records/:id` | Delete. |

**Create body (`CreateFinanceRecordDto`):**
```ts
branchId: string;    // @IsString (cuid) — must exist → 404
type: 'INCOME' | 'EXPENSE'; // @IsEnum(FinanceType)
amount: number;      // @IsNumber @Min(0)
category?: string;   // @IsOptional @IsString
description?: string;// @IsOptional @IsString
occurredAt?: string; // @IsOptional @IsDateString (default now)
```
`UpdateFinanceRecordDto = Partial`.
**GET query:** pagination + `type?`, `branchId?`, `from?`/`to?`
(on `occurredAt`), `search?`.
**Response (FinanceRecord):** all scalar fields.

---

## 14. Salaries  `/api/finance/salaries`  (FOUNDER only)  + Lesson-rates

### 14.1 Salaries

| Method | Path | Notes |
|---|---|---|
| GET | `/api/finance/salaries` | Paginated; `teacherId?`, `employeeId?`, `status?`, `from?`, `to?`. |
| GET | `/api/finance/salaries/:id` | One (+ teacher/employee). |
| POST | `/api/finance/salaries/compute` | Compute teacher salary for a period (no persist by default). |
| POST | `/api/finance/salaries` | Persist a salary row (from a computation or fixed). |
| PATCH | `/api/finance/salaries/:id/pay` | Mark `PAID` (`paidAt=now`). |
| PATCH | `/api/finance/salaries/:id` | Update amount/status. |
| DELETE | `/api/finance/salaries/:id` | Delete. |

**Compute body (`ComputeSalaryDto`):**
```ts
teacherId: string; // @IsString (cuid) — must exist → 404
from: string;      // @IsDateString (period start)
to: string;        // @IsDateString (period end)
persist?: boolean; // @IsOptional @IsBoolean — also create a Salary row (PER_LESSON, PENDING)
```
Applies §0.6: sum `payRate(lesson)` over the teacher's `isConducted` lessons
with `startsAt ∈ [from, to]`. **Compute response:**
```json
{
  "teacherId":"...", "periodStart":"...", "periodEnd":"...",
  "basis":"PER_LESSON", "lessonsCount": 18, "amount": 690.00,
  "lessons": [ { "lessonId":"...", "startsAt":"...", "payRate": 40.00 } ]
}
```
**Create body (`CreateSalaryDto`):**
```ts
teacherId?: string;  // @IsOptional (cuid) — exactly one of teacher/employee
employeeId?: string; // @IsOptional (cuid)
basis: 'PER_LESSON' | 'FIXED'; // @IsEnum(SalaryBasis)
periodStart: string; // @IsDateString
periodEnd: string;   // @IsDateString
amount: number;      // @IsNumber @Min(0)
status?: 'PENDING' | 'PAID'; // @IsOptional @IsEnum(SalaryStatus)
```
Validate exactly one of `teacherId`/`employeeId` is set (else `400`).
**Response (Salary):** scalar fields + optional nested `teacher`/`employee`.

### 14.2 Lesson-rates  `/api/finance/lesson-rates`  (FOUNDER only)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/finance/lesson-rates?groupId=` | List (plain array). |
| GET | `/api/finance/lesson-rates/:id` | One. |
| POST | `/api/finance/lesson-rates` | Create. |
| PATCH | `/api/finance/lesson-rates/:id` | Update. |
| DELETE | `/api/finance/lesson-rates/:id` | Delete. |

**Create body (`CreateLessonRateDto`):**
```ts
groupId?: string; // @IsOptional (cuid) — rate scoped to a group (or global if null)
name?: string;    // @IsOptional @IsString  (e.g. "Стандарт 40")
amount: number;   // @IsNumber @Min(0)
```
`UpdateLessonRateDto = Partial`.
**Response (LessonRate):** `{ id, groupId, name, amount, createdAt, updatedAt }`.

---

## 15. Analytics  `/api/finance/analytics`  (FOUNDER only)

Time-filtered totals per branch + combined, plus simple chart series.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/finance/analytics/summary` | Income/expense/debt totals, per branch + combined. |
| GET | `/api/finance/analytics/series` | Time series for charts. |

**Query (both):** `from?` (`@IsDateString`), `to?` (`@IsDateString`),
`branchId?` (restrict to one branch). `series` also takes
`groupBy?` = `day|week|month` (`@IsIn`, default `month`) and
`metric?` = `income|expense|debt|net` (`@IsIn`, default `net`).

- **income** = Σ `FinanceRecord.amount where type=INCOME` **+** Σ `PAID` payment
  amounts within range (money actually received). Implementer note: keep this
  consistent between summary and series.
- **expense** = Σ `FinanceRecord.amount where type=EXPENSE` (+ optionally paid
  salaries; see note). **debt** = Σ `UNPAID` elapsed payment amounts.
- **net** = income − expense.

**Summary response:**
```json
{
  "range": { "from":"...", "to":"..." },
  "combined": { "income": 12000.00, "expense": 5000.00,
                "net": 7000.00, "debt": 3450.00 },
  "byBranch": [
    { "branchId":"...", "branchName":"Центр №1",
      "income": 6000.00, "expense": 2000.00, "net": 4000.00, "debt": 1200.00 }
  ]
}
```
**Series response:**
```json
{
  "metric": "net", "groupBy": "month",
  "combined": [ { "bucket":"2026-06", "value": 4000.00 } ],
  "byBranch": [
    { "branchId":"...", "branchName":"...",
      "points": [ { "bucket":"2026-06", "value": 2000.00 } ] }
  ]
}
```

---

## 16. Out of scope for this contract

Auth (`/api/auth/*`), users (`/api/users/*`), health, chats
(`/api/conversations`, `/api/messages`), broadcasts (`/api/broadcasts`),
notifications (`/api/notifications`) — owned by their respective module agents.
When those touch shared conventions (pagination, RBAC wiring in §0.1), they must
follow §0.

---

## Appendix A — Role quick-reference

| Resource group | FOUNDER | ADMIN | SALES_MANAGER | TEACHER | STUDENT |
|---|:--:|:--:|:--:|:--:|:--:|
| Dictionaries read (branch/subject/type/course/teacher/group) | R | R | R | R | — |
| Dictionaries write | W | W | — | — | — |
| Students read | R | R | — | R(own grp) | self only |
| Students/parents write | W | W | — | — | — |
| Group add/remove student | W | W | — | W(own) | — |
| Lessons write | W | W | — | conduct(own) | — |
| Journal write | W | W | — | W(own grp) | — |
| `/me/student/*` | — | — | — | — | R(self) |
| `/me/teacher/*` | — | — | — | R(self) | — |
| Payments / Finance / Salaries / Analytics | W | — | — | — | — |

R = read, W = read+write. Ownership scopes ("own", "self") enforced in services.
