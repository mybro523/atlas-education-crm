import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Group,
  GroupListParams,
  GroupStudent,
  GroupStudentsParams,
  AvailableStudent,
  GroupAvailableStudentsParams,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupStudentDto,
} from './model/types';

/** Groups (API_CONTRACT §7). Paginated list + student membership endpoints. */
export const groupApi = {
  async list(params?: GroupListParams): Promise<Paginated<Group>> {
    const { data } = await axiosClient.get<Paginated<Group>>('/groups', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Group> {
    const { data } = await axiosClient.get<Group>(`/groups/${id}`);
    return data;
  },

  async create(dto: CreateGroupDto): Promise<Group> {
    const { data } = await axiosClient.post<Group>('/groups', dto);
    return data;
  },

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const { data } = await axiosClient.patch<Group>(`/groups/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/groups/${id}`);
  },

  // --- Membership ---

  async listStudents(
    groupId: string,
    params?: GroupStudentsParams,
  ): Promise<GroupStudent[]> {
    const { data } = await axiosClient.get<GroupStudent[]>(
      `/groups/${groupId}/students`,
      { params },
    );
    return data;
  },

  /**
   * Students that can still be enrolled into the group (NOT already active
   * members; cross-branch). Paginated `{ items, meta }`.
   */
  async listAvailableStudents(
    groupId: string,
    params?: GroupAvailableStudentsParams,
  ): Promise<Paginated<AvailableStudent>> {
    const { data } = await axiosClient.get<Paginated<AvailableStudent>>(
      `/groups/${groupId}/available-students`,
      { params },
    );
    return data;
  },

  async addStudent(
    groupId: string,
    dto: AddGroupStudentDto,
  ): Promise<GroupStudent> {
    const { data } = await axiosClient.post<GroupStudent>(
      `/groups/${groupId}/students`,
      dto,
    );
    return data;
  },

  async removeStudent(groupId: string, studentId: string): Promise<void> {
    await axiosClient.delete(`/groups/${groupId}/students/${studentId}`);
  },
};
