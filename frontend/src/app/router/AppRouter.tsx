import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES } from '@/shared/config';
import { AppLayout } from '@/widgets/AppLayout';

import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { StudentsPage } from '@/pages/students';
import { TeachersPage } from '@/pages/teachers';
import { GroupsPage, GroupDetailPage } from '@/pages/groups';
import { CoursesPage } from '@/pages/courses';
import { BranchesPage } from '@/pages/branches';
import { RoomsPage } from '@/pages/rooms';
import { CourseTypesPage } from '@/pages/course-types';
import { SchedulePage } from '@/pages/schedule';
import { JournalPage } from '@/pages/journal';
import { FinancePage } from '@/pages/finance';
import { StudentCabinetPage } from '@/pages/student-cabinet';
import { TeacherCabinetPage } from '@/pages/teacher-cabinet';
import { ChatsPage } from '@/pages/chats';
import { BroadcastPage } from '@/pages/broadcast';
import { SettingsPage } from '@/pages/settings';
import { NotFoundPage } from '@/pages/not-found';

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

            {/* Finance: founder only */}
            <Route element={<RoleRoute allow={[ROLES.FOUNDER]} />}>
              <Route path={ROUTES.finance} element={<FinancePage />} />
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
