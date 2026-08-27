import { useEffect, useRef, useState } from 'react';

export interface AnimatedNumberProps {
  /** Target numeric value; changes animate from the previous value. */
  value: number;
  /** Renders the in-flight number (e.g. formatMoney / toLocaleString). */
  format?: (n: number) => string;
  /** Animation length in ms. */
  duration?: number;
}

/**
 * Count-up number: eases from the previously shown value to `value` with an
 * ease-out cubic curve, so KPI figures "roll in" instead of snapping. Falls
 * back to an instant update when the user prefers reduced motion. Renders in
 * tabular-nums so the width stays stable while digits change.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const shownRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || shownRef.current === value) {
      shownRef.current = value;
      setDisplay(value);
      return;
    }

    const from = shownRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      shownRef.current = current;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        shownRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className="tabular-nums">{format(display)}</span>;
}
