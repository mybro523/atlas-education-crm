export { lessonRateApi } from './api';
export type {
  LessonRate,
  LessonRateListParams,
  CreateLessonRateDto,
  UpdateLessonRateDto,
} from './model/types';
export {
  lessonRateKeys,
  useLessonRates,
  useLessonRate,
  useCreateLessonRate,
  useUpdateLessonRate,
  useDeleteLessonRate,
} from './model/queries';
