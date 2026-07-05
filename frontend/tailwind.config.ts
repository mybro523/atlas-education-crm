import type { Config } from 'tailwindcss';

/**
 * Atlas CRM Tailwind config.
 * - darkMode 'class' (toggled by ThemeProvider on <html>).
 * - Brand palette: WHITE + BLUE. Primary blue #2563EB (blue-600).
 * - Semantic colors are driven by CSS variables (see app/styles/index.css)
 *   so the same class works in light + dark mode.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fixed brand blue scale.
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // primary blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Semantic, CSS-variable-driven tokens (RGB channels).
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        'foreground-muted': 'rgb(var(--color-foreground-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
      },
      fontFamily: {
        // Self-hosted Source Sans 3 (variable). Calm, professional, editorial.
        sans: [
          '"Source Sans 3 Variable"',
          '"Source Sans 3"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      // Tighter, calmer editorial scale — larger sizes get slightly negative
      // tracking so headings read composed rather than shouty.
      letterSpacing: {
        tight: '-0.011em',
        tighter: '-0.02em',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        // Subtle, neutral elevation — no colored glow (calmer, less "template").
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        elevated:
          '0 4px 16px -6px rgb(0 0 0 / 0.12), 0 2px 6px -3px rgb(0 0 0 / 0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
