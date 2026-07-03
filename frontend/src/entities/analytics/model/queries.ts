import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../api';
import type {
  AnalyticsSummaryParams,
  AnalyticsSeriesParams,
} from './types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (params?: AnalyticsSummaryParams) =>
    [...analyticsKeys.all, 'summary', params ?? {}] as const,
  series: (params?: AnalyticsSeriesParams) =>
    [...analyticsKeys.all, 'series', params ?? {}] as const,
};

export function useAnalyticsSummary(params?: AnalyticsSummaryParams) {
  return useQuery({
    queryKey: analyticsKeys.summary(params),
    queryFn: () => analyticsApi.summary(params),
  });
}

export function useAnalyticsSeries(params?: AnalyticsSeriesParams) {
  return useQuery({
    queryKey: analyticsKeys.series(params),
    queryFn: () => analyticsApi.series(params),
  });
}
