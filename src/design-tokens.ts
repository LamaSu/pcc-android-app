/**
 * Design tokens for the PCC Android shell.
 *
 * Ported from C:\Users\globa\physical-capability-cloud\apps\dashboard\src\index.css
 * (the "Space-Age Control Room" theme). Adapted for mobile-first usage —
 * exposed as a JS object so React components can consume tokens directly
 * (no Tailwind dependency in this shell yet).
 *
 * Conventions:
 *  - colors are in #rrggbb (or rgba where alpha is needed)
 *  - spacings are in pixels
 *  - radii are in pixels
 *  - z-index uses a tiny scale so values stay readable
 *
 * Each token also gets emitted as a CSS custom property on :root via
 * src/styles/global.css so plain CSS can reference them too.
 */

export const colors = {
  // Deep space backgrounds
  bg900: '#050a0e',
  bg800: '#090f15',
  bg700: '#0d1520',
  bg600: '#121c2a',

  // Electric blue (primary accent)
  primary700: '#1a3a6c',
  primary600: '#2255a4',
  primary500: '#3b82f6',
  primary400: '#60a5fa',
  primary300: '#93c5fd',

  // Ice cyan (data displays)
  cyan500: '#00a8cc',
  cyan400: '#00d4ff',
  cyan300: '#80eaff',

  // Amber gold (alerts)
  gold500: '#e07b00',
  gold400: '#ffaa00',
  gold300: '#ffc940',

  // Foreground
  fg: '#f0f4f0',
  fgMuted: '#8b949e',
  fgDim: '#566370',

  // Glass-morphism layers
  glassBg: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHover: 'rgba(255, 255, 255, 0.08)',

  // Status palette (mirrors @pcc/ui status color usage)
  statusOnline: '#60a5fa',
  statusExecuting: '#ffaa00',
  statusCompleted: '#3b82f6',
  statusFailed: '#ff4444',
  statusOffline: '#4a5568',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  fontFamily: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    display: '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    hero: 40,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const shadows = {
  card: '0 1px 2px rgba(0,0,0,0.4)',
  cardElevated: '0 4px 12px rgba(0,0,0,0.5)',
  glow: '0 0 18px rgba(96, 165, 250, 0.35)',
} as const;

export const zIndex = {
  base: 0,
  card: 1,
  navBar: 50,
  modal: 100,
  toast: 200,
} as const;

/**
 * Status -> color mapping. Mirrors the patterns in
 * packages/ui/src/primitives/PulseIndicator.tsx and the kernel status
 * tokens. Keys are the typical strings the API returns for kernels,
 * jobs, devices, escrows.
 */
export const statusColor: Record<string, string> = {
  online: colors.statusOnline,
  available: colors.statusOnline,
  ready: colors.statusOnline,
  active: colors.statusOnline,
  executing: colors.statusExecuting,
  running: colors.statusExecuting,
  pending: colors.statusExecuting,
  queued: colors.statusExecuting,
  completed: colors.statusCompleted,
  funded: colors.statusCompleted,
  released: colors.statusCompleted,
  failed: colors.statusFailed,
  error: colors.statusFailed,
  disputed: colors.statusFailed,
  offline: colors.statusOffline,
  maintenance: colors.statusOffline,
  unknown: colors.statusOffline,
};

export type DesignTokens = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadows;
  zIndex: typeof zIndex;
};

export const tokens: DesignTokens = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  zIndex,
};

export default tokens;
