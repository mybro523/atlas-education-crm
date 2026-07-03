export { studentApi } from './api';
export type {
  Student,
  Parent,
  StudentGroupLink,
  StudentListParams,
  CreateStudentDto,
  UpdateStudentDto,
  CreateParentDto,
  UpdateParentDto,
} from './model/types';
export {
  studentKeys,
  useStudents,
  useStudent,
  useStudentParents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useAddParent,
  useUpdateParent,
  useDeleteParent,
} from './model/queries';
