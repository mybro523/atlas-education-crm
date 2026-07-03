/**
 * Chart palette. recharts renders to SVG and cannot read CSS variables through
 * Tailwind tokens directly, so we expose concrete hex values. The brand purple
 * scale mirrors tailwind.config.ts. These read well on both light and dark
 * surfaces.
 */

/** Semantic series colors. */
export const CHART_COLORS = {
  income: '#16a34a', // green-600
  expense: '#ef4444', // red-500
  debt: '#f59e0b', // amber-500
  net: '#7c3aed', // brand-600 (primary violet)
  neutral: '#8b5cf6', // brand-500
} as const;

/** Per-branch categorical palette (purple-leaning, distinct hues). */
export const BRANCH_COLORS = [
  '#7c3aed', // violet
  '#2563eb', // blue
  '#0d9488', // teal
  '#db2777', // pink
  '#ea580c', // orange
  '#65a30d', // lime
] as const;

/** Pie slices for the income / expense / debt breakdown. */
export const BREAKDOWN_COLORS = [
  CHART_COLORS.income,
  CHART_COLORS.expense,
  CHART_COLORS.debt,
] as const;

/** Pick a stable branch color by index. */
export function branchColor(index: number): string {
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}
