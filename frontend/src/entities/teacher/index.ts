export { teacherApi } from './api';
export type {
  Teacher,
  TeacherListParams,
  CreateTeacherDto,
  UpdateTeacherDto,
} from './model/types';
export {
  teacherKeys,
  useTeachers,
  useTeacher,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
} from './model/queries';
