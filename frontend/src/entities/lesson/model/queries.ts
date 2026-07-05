import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { lessonApi } from '../api';
import type {
  Lesson,
  LessonListParams,
  CreateLessonDto,
  UpdateLessonDto,
  ConductLessonDto,
  RoomOccupancyParams,
} from './types';

export const lessonKeys = {
  ...createQueryKeys('lessons'),
  occupancy: (params?: RoomOccupancyParams) =>
    ['lessons', 'occupancy', params ?? {}] as const,
};

export function useLessons(params?: LessonListParams) {
  return useQuery({
    queryKey: lessonKeys.list(params),
    queryFn: () => lessonApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: lessonKeys.detail(id ?? ''),
    queryFn: () => lessonApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateLesson() {
  return useOptimisticMutation<Lesson, CreateLessonDto>({
    mutationFn: (dto) => lessonApi.create(dto),
    keysToCancel: [lessonKeys.lists()],
    keysToInvalidate: [lessonKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Lesson = {
        id: `optimistic-${Date.now()}`,
        groupId: dto.groupId,
        teacherId: dto.teacherId ?? null,
        roomId: dto.roomId ?? null,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt ?? null,
        teacherPayRate: dto.teacherPayRate ?? null,
        lessonRateId: dto.lessonRateId ?? null,
        isConducted: dto.isConducted ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: lessonKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateLesson() {
  return useOptimisticMutation<Lesson, { id: string; dto: UpdateLessonDto }>({
    mutationFn: ({ id, dto }) => lessonApi.update(id, dto),
    keysToCancel: [lessonKeys.lists(), lessonKeys.details()],
    keysToInvalidate: [lessonKeys.lists(), lessonKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: lessonKeys.lists() },
        updateInListCache<Lesson>(id, dto),
      );
      qc.setQueryData<Lesson>(lessonKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteLesson() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => lessonApi.remove(id),
    keysToCancel: [lessonKeys.lists()],
    keysToInvalidate: [lessonKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: lessonKeys.lists() },
        removeFromListCache<Lesson>(id),
      );
    },
  });
}

/** Mark a lesson conducted / not (PATCH /lessons/:id/conduct). */
export function useConductLesson() {
  return useOptimisticMutation<Lesson, { id: string; dto: ConductLessonDto }>({
    mutationFn: ({ id, dto }) => lessonApi.conduct(id, dto),
    keysToCancel: [lessonKeys.lists(), lessonKeys.details()],
    keysToInvalidate: [lessonKeys.lists(), lessonKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: lessonKeys.lists() },
        updateInListCache<Lesson>(id, { isConducted: dto.isConducted }),
      );
      qc.setQueryData<Lesson>(lessonKeys.detail(id), (old) =>
        old ? { ...old, isConducted: dto.isConducted } : old,
      );
    },
  });
}

/** Room free/occupied view over a window (GET /schedule/rooms/occupancy). */
export function useRoomOccupancy(params?: RoomOccupancyParams) {
  return useQuery({
    queryKey: lessonKeys.occupancy(params),
    queryFn: () => lessonApi.roomOccupancy(params),
    enabled: Boolean(params?.date || (params?.from && params?.to)),
    placeholderData: keepPreviousData,
  });
}
