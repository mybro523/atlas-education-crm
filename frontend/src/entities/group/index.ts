export { groupApi } from './api';
export type {
  Group,
  GroupStudent,
  GroupListParams,
  GroupStudentsParams,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupStudentDto,
} from './model/types';
export {
  groupKeys,
  useGroups,
  useGroup,
  useGroupStudents,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupStudent,
  useRemoveGroupStudent,
} from './model/queries';
