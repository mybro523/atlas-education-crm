/**
 * Chart palette. recharts renders to SVG and cannot read CSS variables through
 * Tailwind tokens directly, so we expose concrete hex values. The brand blue
 * scale mirrors tailwind.config.ts. These read well on both light and dark
 * surfaces.
 */

/** Semantic series colors. */
export const CHART_COLORS = {
  income: '#16a34a', // green-600
  expense: '#ef4444', // red-500
  debt: '#f59e0b', // amber-500
  net: '#2563eb', // brand-600 (primary blue)
  neutral: '#3b82f6', // brand-500
} as const;

/**
 * Lighter companions of CHART_COLORS, used as the TOP stop of the pseudo-3D
 * vertical gradients (light catches the top of a bar / slice, the base stays
 * saturated). Same hue family one Tailwind step lighter.
 */
export const CHART_COLORS_LIGHT = {
  income: '#4ade80', // green-400
  expense: '#f87171', // red-400
  debt: '#fbbf24', // amber-400
  net: '#60a5fa', // brand-400
  neutral: '#93c5fd', // brand-300
} as const;

/**
 * Darker companions, used as the "rim" of the donut and bar bases to fake
 * depth (the side that faces away from the light).
 */
export const CHART_COLORS_DARK = {
  income: '#15803d', // green-700
  expense: '#b91c1c', // red-700
  debt: '#b45309', // amber-700
  net: '#1d4ed8', // brand-700
  neutral: '#1e40af', // brand-800
} as const;

/** Per-branch categorical palette (blue-leaning brand lead, distinct hues). */
export const BRANCH_COLORS = [
  '#2563eb', // blue (brand)
  '#06b6d4', // cyan
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

/* --- SVG def ids for the pseudo-3D chart look (rendered by <ChartDefs/>) --- */

/** Gradient id for a semantic metric (must match ChartDefs). */
export function metricGradientId(metric: keyof typeof CHART_COLORS): string {
  return `chart3d-grad-${metric}`;
}

/** Soft drop shadow that sits under bars/slices to lift them off the canvas. */
export const CHART_SHADOW_ID = 'chart3d-shadow';
/** Stronger colored glow used for hovered (active) elements. */
export const CHART_GLOW_ID = 'chart3d-glow';
