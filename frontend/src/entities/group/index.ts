export { groupApi } from './api';
export type {
  Group,
  GroupStudent,
  AvailableStudent,
  GroupListParams,
  GroupStudentsParams,
  GroupAvailableStudentsParams,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupStudentDto,
} from './model/types';
export {
  groupKeys,
  useGroups,
  useGroup,
  useGroupStudents,
  useAvailableStudents,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupStudent,
  useRemoveGroupStudent,
} from './model/queries';
