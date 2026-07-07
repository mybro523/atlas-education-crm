import { useQuery } from '@tanstack/react-query';

import { axiosClient } from '@/shared/api';
import { useOptimisticMutation } from '@/shared/lib/query';

/** System settings map (merged over server defaults). */
export type SystemSettings = Record<string, string>;

export const systemSettingsKeys = {
  all: ['system-settings'] as const,
};

const settingsApi = {
  async getAll(): Promise<SystemSettings> {
    const { data } = await axiosClient.get<SystemSettings>('/settings');
    return data;
  },
  async update(entries: Record<string, string>): Promise<SystemSettings> {
    const { data } = await axiosClient.put<SystemSettings>('/settings', {
      entries,
    });
    return data;
  },
};

export function useSystemSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.all,
    queryFn: () => settingsApi.getAll(),
    staleTime: 5 * 60_000,
  });
}

/** Update settings — optimistic merge, server truth reconciles. */
export function useUpdateSystemSettings() {
  return useOptimisticMutation<SystemSettings, Record<string, string>>({
    mutationFn: (entries) => settingsApi.update(entries),
    keysToCancel: [systemSettingsKeys.all],
    keysToInvalidate: [systemSettingsKeys.all],
    optimisticUpdate: (entries, qc) => {
      qc.setQueryData<SystemSettings>(systemSettingsKeys.all, (old) => ({
        ...(old ?? {}),
        ...entries,
      }));
    },
    onServerData: (data, _vars, qc) => {
      qc.setQueryData(systemSettingsKeys.all, data);
    },
  });
}
