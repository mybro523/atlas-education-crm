export { salaryApi } from './api';
export type {
  Salary,
  SalaryBasis,
  SalaryStatus,
  SalaryListParams,
  ComputeSalaryDto,
  SalaryComputation,
  CreateSalaryDto,
  UpdateSalaryDto,
  PaySalaryDto,
} from './model/types';
export {
  salaryKeys,
  useSalaries,
  useSalary,
  useComputeSalary,
  useCreateSalary,
  usePaySalary,
  useUpdateSalary,
  useDeleteSalary,
} from './model/queries';
