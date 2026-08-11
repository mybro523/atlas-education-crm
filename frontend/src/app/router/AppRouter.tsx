import { lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES } from '@/shared/config';
import { AppLayout } from '@/widgets/AppLayout';
import { prefetchPages } from './prefetchPages';

// LoginPage stays eager: it is the entry paint for unauthenticated visitors, so
// code-splitting it would only add a spinner flash before first render. Every
// in-shell page below is lazy — each becomes its own chunk, loaded on first
// navigation and cached thereafter (see AppLayout's <Suspense> boundary).
import { LoginPage } from '@/pages/login';

/** Wrap a named page export as a lazy default for React.lazy. */
const lazyPage = (
  loader: () => Promise<Record<string, unknown>>,
  name: string,
) => lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })));

const DashboardPage = lazyPage(() => import('@/pages/dashboard'), 'DashboardPage');
const StudentsPage = lazyPage(() => import('@/pages/students'), 'StudentsPage');
const TeachersPage = lazyPage(() => import('@/pages/teachers'), 'TeachersPage');
const GroupsPage = lazyPage(() => import('@/pages/groups'), 'GroupsPage');
const GroupDetailPage = lazyPage(() => import('@/pages/groups'), 'GroupDetailPage');
const CoursesPage = lazyPage(() => import('@/pages/courses'), 'CoursesPage');
const BranchesPage = lazyPage(() => import('@/pages/branches'), 'BranchesPage');
const RoomsPage = lazyPage(() => import('@/pages/rooms'), 'RoomsPage');
const CourseTypesPage = lazyPage(() => import('@/pages/course-types'), 'CourseTypesPage');
const SchedulePage = lazyPage(() => import('@/pages/schedule'), 'SchedulePage');
const JournalPage = lazyPage(() => import('@/pages/journal'), 'JournalPage');
const FinancePage = lazyPage(() => import('@/pages/finance'), 'FinancePage');
const StudentPaymentsPage = lazyPage(() => import('@/pages/student-payments'), 'StudentPaymentsPage');
const EmployeesPage = lazyPage(() => import('@/pages/employees'), 'EmployeesPage');
const SalariesPage = lazyPage(() => import('@/pages/salaries'), 'SalariesPage');
const StudentCabinetPage = lazyPage(() => import('@/pages/student-cabinet'), 'StudentCabinetPage');
const TeacherCabinetPage = lazyPage(() => import('@/pages/teacher-cabinet'), 'TeacherCabinetPage');
const ChatsPage = lazyPage(() => import('@/pages/chats'), 'ChatsPage');
const BroadcastPage = lazyPage(() => import('@/pages/broadcast'), 'BroadcastPage');
const SettingsPage = lazyPage(() => import('@/pages/settings'), 'SettingsPage');
const NotFoundPage = lazyPage(() => import('@/pages/not-found'), 'NotFoundPage');

import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RoleRoute } from './RoleRoute';

/**
 * Route tree.
 * - /login is public-only.
 * - Everything else lives under the protected AppLayout shell.
 * - Role-restricted sections are wrapped in <RoleRoute>, mirroring the spec's
 *   permission matrix (finance = FOUNDER only; chats = SALES_MANAGER+FOUNDER;
 *   broadcast = FOUNDER+ADMIN; etc.).
 */
export function AppRouter() {
  // Warm all page chunks during idle time so post-login navigation is instant.
  useEffect(() => {
    prefetchPages();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
        </Route>

        {/* Protected shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />

            {/* Students: founder, admin, teacher */}
            <Route
              element={
                <RoleRoute
                  allow={[ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER]}
                />
              }
            >
              <Route path={ROUTES.students} element={<StudentsPage />} />
            </Route>

            {/* Teachers + Courses + dictionaries: founder, admin */}
            <Route element={<RoleRoute allow={[ROLES.FOUNDER, ROLES.ADMIN]} />}>
              <Route path={ROUTES.teachers} element={<TeachersPage />} />
              <Route path={ROUTES.courses} element={<CoursesPage />} />
              <Route path={ROUTES.branches} element={<BranchesPage />} />
              <Route path={ROUTES.rooms} element={<RoomsPage />} />
              <Route
                path={ROUTES.courseTypes}
                element={<CourseTypesPage />}
              />
            </Route>

            {/* Groups: founder, admin, teacher */}
            <Route
              element={
                <RoleRoute
                  allow={[ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER]}
                />
              }
            >
              <Route path={ROUTES.groups} element={<GroupsPage />} />
              <Route
                path={`${ROUTES.groups}/:id`}
                element={<GroupDetailPage />}
              />
            </Route>

            {/* Schedule + Journal: founder, admin, teacher (students use
                their cabinet, which reads self-scoped endpoints) */}
            <Route
              element={
                <RoleRoute
                  allow={[ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER]}
                />
              }
            >
              <Route path={ROUTES.schedule} element={<SchedulePage />} />
              <Route path={ROUTES.journal} element={<JournalPage />} />
            </Route>

            {/* Student cabinet: student's own data */}
            <Route element={<RoleRoute allow={[ROLES.STUDENT]} />}>
              <Route
                path={ROUTES.studentCabinet}
                element={<StudentCabinetPage />}
              />
            </Route>

            {/* Teacher cabinet: teacher's own groups/students/schedule */}
            <Route element={<RoleRoute allow={[ROLES.TEACHER]} />}>
              <Route
                path={ROUTES.teacherCabinet}
                element={<TeacherCabinetPage />}
              />
            </Route>

            {/* Finance + staff management + salaries: founder only */}
            <Route element={<RoleRoute allow={[ROLES.FOUNDER]} />}>
              <Route path={ROUTES.finance} element={<FinancePage />} />
              <Route path={ROUTES.employees} element={<EmployeesPage />} />
              <Route path={ROUTES.salaries} element={<SalariesPage />} />
            </Route>

            {/* Chats: sales manager + founder (admin excluded) */}
            <Route
              element={
                <RoleRoute allow={[ROLES.SALES_MANAGER, ROLES.FOUNDER]} />
              }
            >
              <Route path={ROUTES.chats} element={<ChatsPage />} />
            </Route>

            {/* Broadcast (SMS): founder + admin */}
            <Route element={<RoleRoute allow={[ROLES.FOUNDER, ROLES.ADMIN]} />}>
              <Route path={ROUTES.broadcast} element={<BroadcastPage />} />
            </Route>

            {/* Student payments history: founder + admin */}
            <Route element={<RoleRoute allow={[ROLES.FOUNDER, ROLES.ADMIN]} />}>
              <Route
                path={ROUTES.studentPayments}
                element={<StudentPaymentsPage />}
              />
            </Route>

            {/* Settings: any authenticated user (hosts Telegram linking) */}
            <Route path={ROUTES.settings} element={<SettingsPage />} />

            {/* In-shell 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        {/* Absolute fallback */}
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
