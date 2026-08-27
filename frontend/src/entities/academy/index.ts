export { academyApi } from './api';
export {
  academyKeys,
  useAcademies,
  useAcademyPayments,
  useCreateAcademy,
  useExtendAcademy,
  useUpdateAcademy,
  useSetAcademyStatus,
  useDeleteAcademy,
} from './model/queries';
export type {
  Academy,
  AcademyPayment,
  AcademyPaymentsResponse,
  AcademyStats,
  AcademyStatus,
  CreateAcademyDto,
  ExtendAcademyDto,
  UpdateAcademyDto,
} from './model/types';
