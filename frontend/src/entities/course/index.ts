export { courseApi } from './api';
export type {
  Course,
  CourseListParams,
  CreateCourseDto,
  UpdateCourseDto,
} from './model/types';
export {
  courseKeys,
  useCourses,
  useCourse,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
} from './model/queries';
