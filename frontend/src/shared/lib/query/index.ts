export {
  useOptimisticMutation,
  insertIntoListCache,
  updateInListCache,
  removeFromListCache,
  replaceInListCache,
  makeOptimisticId,
  isOptimisticId,
  OPTIMISTIC_ID_PREFIX,
  type OptimisticMutationConfig,
} from './useOptimisticMutation';
export {
  createQueryKeys,
  keyStartsWith,
  type QueryKeys,
} from './queryKeys';
export { createQueryClient } from './queryClient';
export type {
  Paginated,
  PaginationMeta,
  PaginationParams,
} from './pagination';
