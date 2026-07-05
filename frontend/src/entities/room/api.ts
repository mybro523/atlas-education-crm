import { axiosClient } from '@/shared/api';
import type {
  Room,
  RoomListParams,
  CreateRoomDto,
  UpdateRoomDto,
} from './model/types';

/** Rooms / kabinets dictionary (backend `/rooms`). Non-paginated: plain array. */
export const roomApi = {
  async list(params?: RoomListParams): Promise<Room[]> {
    const { data } = await axiosClient.get<Room[]>('/rooms', { params });
    return data;
  },

  async getById(id: string): Promise<Room> {
    const { data } = await axiosClient.get<Room>(`/rooms/${id}`);
    return data;
  },

  async create(dto: CreateRoomDto): Promise<Room> {
    const { data } = await axiosClient.post<Room>('/rooms', dto);
    return data;
  },

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const { data } = await axiosClient.patch<Room>(`/rooms/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/rooms/${id}`);
  },
};
