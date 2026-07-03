export { teacherApi } from './api';
export type {
  Teacher,
  TeacherListParams,
  CreateTeacherDto,
  UpdateTeacherDto,
  SetTeacherSubjectsDto,
} from './model/types';
export {
  teacherKeys,
  useTeachers,
  useTeacher,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  useSetTeacherSubjects,
} from './model/queries';
