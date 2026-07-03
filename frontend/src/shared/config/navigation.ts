import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Boxes,
  BookOpen,
  Building2,
  Library,
  Layers,
  CalendarDays,
  ClipboardList,
  Wallet,
  MessagesSquare,
  Megaphone,
  UserCircle,
  Presentation,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ROLES, type Role } from './roles';
import { ROUTES } from './constants';

export interface NavItem {
  /** Route path. */
  to: string;
  /** i18n key for the label (see common.json → nav.*). */
  labelKey: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. */
  roles: Role[];
}

/**
 * Master navigation list. The Sidebar filters this by the current user's role.
 * Access rules mirror the spec's permission matrix:
 * - Chats: SALES_MANAGER (work) + FOUNDER (oversight). ADMIN has NO access.
 * - Finance: FOUNDER only. ADMIN has NO access.
 * - Broadcast (SMS): FOUNDER + ADMIN.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: ROUTES.dashboard,
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    roles: [
      ROLES.FOUNDER,
      ROLES.ADMIN,
      ROLES.SALES_MANAGER,
      ROLES.TEACHER,
      ROLES.STUDENT,
    ],
  },
  {
    to: ROUTES.studentCabinet,
    labelKey: 'nav.studentCabinet',
    icon: UserCircle,
    roles: [ROLES.STUDENT],
  },
  {
    to: ROUTES.teacherCabinet,
    labelKey: 'nav.teacherCabinet',
    icon: Presentation,
    roles: [ROLES.TEACHER],
  },
  {
    to: ROUTES.students,
    labelKey: 'nav.students',
    icon: Users,
    roles: [ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER],
  },
  {
    to: ROUTES.teachers,
    labelKey: 'nav.teachers',
    icon: GraduationCap,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.groups,
    labelKey: 'nav.groups',
    icon: Boxes,
    roles: [ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER],
  },
  {
    to: ROUTES.courses,
    labelKey: 'nav.courses',
    icon: BookOpen,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.branches,
    labelKey: 'nav.branches',
    icon: Building2,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.subjects,
    labelKey: 'nav.subjects',
    icon: Library,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.courseTypes,
    labelKey: 'nav.courseTypes',
    icon: Layers,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.schedule,
    labelKey: 'nav.schedule',
    icon: CalendarDays,
    roles: [ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER],
  },
  {
    to: ROUTES.journal,
    labelKey: 'nav.journal',
    icon: ClipboardList,
    roles: [ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEACHER],
  },
  {
    to: ROUTES.finance,
    labelKey: 'nav.finance',
    icon: Wallet,
    roles: [ROLES.FOUNDER],
  },
  {
    to: ROUTES.chats,
    labelKey: 'nav.chats',
    icon: MessagesSquare,
    roles: [ROLES.SALES_MANAGER, ROLES.FOUNDER],
  },
  {
    to: ROUTES.broadcast,
    labelKey: 'nav.broadcast',
    icon: Megaphone,
    roles: [ROLES.FOUNDER, ROLES.ADMIN],
  },
  {
    to: ROUTES.settings,
    labelKey: 'nav.settings',
    icon: Settings,
    roles: [
      ROLES.FOUNDER,
      ROLES.ADMIN,
      ROLES.SALES_MANAGER,
      ROLES.TEACHER,
      ROLES.STUDENT,
    ],
  },
];

/** Nav items visible to a given role. */
export function navItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
