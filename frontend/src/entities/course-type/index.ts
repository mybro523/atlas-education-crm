export { courseTypeApi } from './api';
export type {
  CourseType,
  CourseTypeListParams,
  CreateCourseTypeDto,
  UpdateCourseTypeDto,
} from './model/types';
export {
  courseTypeKeys,
  useCourseTypes,
  useCourseType,
  useCreateCourseType,
  useUpdateCourseType,
  useDeleteCourseType,
} from './model/queries';
