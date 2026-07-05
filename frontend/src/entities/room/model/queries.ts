import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { roomApi } from '../api';
import type {
  Room,
  RoomListParams,
  CreateRoomDto,
  UpdateRoomDto,
} from './types';

export const roomKeys = createQueryKeys('rooms');

export function useRooms(params?: RoomListParams) {
  return useQuery({
    queryKey: roomKeys.list(params),
    queryFn: () => roomApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: roomKeys.detail(id ?? ''),
    queryFn: () => roomApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateRoom() {
  return useOptimisticMutation<Room, CreateRoomDto>({
    mutationFn: (dto) => roomApi.create(dto),
    keysToCancel: [roomKeys.lists()],
    keysToInvalidate: [roomKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Room = {
        id: `optimistic-${Date.now()}`,
        name: dto.name,
        branchId: dto.branchId ?? null,
        isActive: dto.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: roomKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateRoom() {
  return useOptimisticMutation<Room, { id: string; dto: UpdateRoomDto }>({
    mutationFn: ({ id, dto }) => roomApi.update(id, dto),
    keysToCancel: [roomKeys.lists(), roomKeys.details()],
    keysToInvalidate: [roomKeys.lists(), roomKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: roomKeys.lists() },
        updateInListCache<Room>(id, dto),
      );
      qc.setQueryData<Room>(roomKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteRoom() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => roomApi.remove(id),
    keysToCancel: [roomKeys.lists()],
    keysToInvalidate: [roomKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: roomKeys.lists() },
        removeFromListCache<Room>(id),
      );
    },
  });
}
