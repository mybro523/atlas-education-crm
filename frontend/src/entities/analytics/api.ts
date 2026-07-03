import { axiosClient } from '@/shared/api';
import type {
  AnalyticsSummary,
  AnalyticsSummaryParams,
  AnalyticsSeries,
  AnalyticsSeriesParams,
} from './model/types';

/** Analytics (API_CONTRACT §15, FOUNDER only). Read-only. */
export const analyticsApi = {
  /** GET /finance/analytics/summary */
  async summary(params?: AnalyticsSummaryParams): Promise<AnalyticsSummary> {
    const { data } = await axiosClient.get<AnalyticsSummary>(
      '/finance/analytics/summary',
      { params },
    );
    return data;
  },

  /** GET /finance/analytics/series */
  async series(params?: AnalyticsSeriesParams): Promise<AnalyticsSeries> {
    const { data } = await axiosClient.get<AnalyticsSeries>(
      '/finance/analytics/series',
      { params },
    );
    return data;
  },
};
