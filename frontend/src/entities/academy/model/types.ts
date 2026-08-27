/** SaaS owner-panel types (INTEGRATION API — /owner/*). */

export type AcademyStatus = 'ACTIVE' | 'BLOCKED';

export interface AcademyStats {
  students: number;
  teachers: number;
  users: number;
  revenue: number | string;
  lastLoginAt: string | null;
}

/** One client academy row in the owner panel. */
export interface Academy {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: AcademyStatus;
  subscriptionStart: string;
  subscriptionEnd: string;
  note: string | null;
  createdAt: string;
  stats?: AcademyStats;
}

/** POST /owner/academies body. */
export interface CreateAcademyDto {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  founderEmail: string;
  founderPassword: string;
  months: number;
  amount?: number;
  note?: string;
}

/** POST /owner/academies/:id/extend body. */
export interface ExtendAcademyDto {
  months: number;
  amount?: number;
  note?: string;
}

/** PATCH /owner/academies/:id body. */
export interface UpdateAcademyDto {
  name?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  note?: string;
}

/** One recorded sale/renewal. */
export interface AcademyPayment {
  id: string;
  academyId: string;
  amount: number | string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  note: string | null;
  academy?: { name: string };
}

export interface AcademyPaymentsResponse {
  items: AcademyPayment[];
  totalAmount: number | string;
}
