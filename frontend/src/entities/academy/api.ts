import { axiosClient } from '@/shared/api';
import type {
  Academy,
  AcademyPaymentsResponse,
  AcademyStatus,
  CreateAcademyDto,
  ExtendAcademyDto,
  UpdateAcademyDto,
} from './model/types';

/** SaaS owner-panel API (OWNER role only). */
export const academyApi = {
  /** GET /owner/academies — all client academies with usage stats. */
  async list(): Promise<Academy[]> {
    const { data } = await axiosClient.get<Academy[]>('/owner/academies');
    return data;
  },

  /** POST /owner/academies — create an academy + its founder account. */
  async create(dto: CreateAcademyDto): Promise<Academy> {
    const { data } = await axiosClient.post<Academy>('/owner/academies', dto);
    return data;
  },

  /** POST /owner/academies/:id/extend — prolong the subscription. */
  async extend(id: string, dto: ExtendAcademyDto): Promise<Academy> {
    const { data } = await axiosClient.post<Academy>(
      `/owner/academies/${id}/extend`,
      dto,
    );
    return data;
  },

  /** PATCH /owner/academies/:id — contact/name edits. */
  async update(id: string, dto: UpdateAcademyDto): Promise<Academy> {
    const { data } = await axiosClient.patch<Academy>(
      `/owner/academies/${id}`,
      dto,
    );
    return data;
  },

  /** PATCH /owner/academies/:id/status — block / unblock. */
  async setStatus(id: string, status: AcademyStatus): Promise<Academy> {
    const { data } = await axiosClient.patch<Academy>(
      `/owner/academies/${id}/status`,
      { status },
    );
    return data;
  },

  /** DELETE /owner/academies/:id — remove a client academy (cascade). */
  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/owner/academies/${id}`);
  },

  /** GET /owner/payments — the sales ledger (optionally one academy). */
  async payments(academyId?: string): Promise<AcademyPaymentsResponse> {
    const { data } = await axiosClient.get<AcademyPaymentsResponse>(
      '/owner/payments',
      { params: academyId ? { academyId } : undefined },
    );
    return data;
  },
};
