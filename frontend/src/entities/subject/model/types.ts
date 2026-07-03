/** Subject dictionary (API_CONTRACT §2). `name` is unique (409 on dup). */
export interface Subject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDto {
  name: string;
}

export type UpdateSubjectDto = Partial<CreateSubjectDto>;
