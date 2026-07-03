/** CourseType flexible dictionary (API_CONTRACT §3). `name` unique (409). */
export interface CourseType {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /course-types query. `?active` filters by `isActive`. */
export interface CourseTypeListParams {
  active?: boolean;
}

export interface CreateCourseTypeDto {
  name: string;
  isActive?: boolean;
}

export type UpdateCourseTypeDto = Partial<CreateCourseTypeDto>;
