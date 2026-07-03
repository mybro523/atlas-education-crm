/** Branch — one of the network's physical locations (API_CONTRACT §1). */
export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDto {
  name: string;
  address?: string;
  phone?: string;
}

export type UpdateBranchDto = Partial<CreateBranchDto>;
