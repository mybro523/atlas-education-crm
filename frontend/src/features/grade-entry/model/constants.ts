/** 5-point scale grade values (API_CONTRACT §9: @IsInt @Min(2) @Max(5)). */
export const GRADE_VALUES = [2, 3, 4, 5] as const;

export type GradeValue = (typeof GRADE_VALUES)[number];
