import {
  CHART_COLORS,
  CHART_COLORS_LIGHT,
  CHART_GLOW_ID,
  CHART_SHADOW_ID,
  metricGradientId,
} from '../lib/chartColors';

/**
 * Reusable SVG defs for the pseudo-3D chart look: a vertical light-to-saturated
 * gradient per semantic color plus shared shadow/glow filters.
 *
 * IMPORTANT: recharts silently DROPS unknown React components from a chart's
 * children, so `<ChartDefs />` would never reach the DOM (bars then reference
 * a missing gradient and turn invisible). Call it as a plain function instead —
 * `{renderChartDefs()}` — so the chart receives a literal `<defs>` element,
 * which recharts does pass through. Duplicate defs across charts on one page
 * resolve to identical content, which SVG tolerates.
 */
export function renderChartDefs() {
  return (
    <defs>
      {(Object.keys(CHART_COLORS) as Array<keyof typeof CHART_COLORS>).map(
        (key) => (
          <linearGradient
            key={key}
            id={metricGradientId(key)}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={CHART_COLORS_LIGHT[key]} />
            <stop offset="55%" stopColor={CHART_COLORS[key]} />
            <stop offset="100%" stopColor={CHART_COLORS[key]} />
          </linearGradient>
        ),
      )}
      <filter id={CHART_SHADOW_ID} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow
          dx="0"
          dy="3"
          stdDeviation="4"
          floodColor="#000000"
          floodOpacity="0.25"
        />
      </filter>
      <filter id={CHART_GLOW_ID} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="6"
          floodColor="#ffffff"
          floodOpacity="0.0"
        />
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="7"
          floodColor="#000000"
          floodOpacity="0.35"
        />
      </filter>
    </defs>
  );
}
