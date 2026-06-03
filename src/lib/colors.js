/** Shared color name → hex for swatches (mobile admin + staff) */

const COLOR_MAP = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  pink: '#ec4899',
  purple: '#a855f7',
  orange: '#f97316',
  black: '#1f2937',
  white: '#f9fafb',
  gold: '#C9A227',
  silver: '#C0C0C0',
  brown: '#92400e',
  maroon: '#881337',
  navy: '#1e3a5a',
  teal: '#14b8a6',
  beige: '#d4c5a9',
  cream: '#fffdd0',
  magenta: '#d946ef',
  coral: '#f87171',
  peach: '#fdba74',
  grey: '#6b7280',
  gray: '#6b7280',
  ivory: '#fffff0',
  'rose gold': '#e6b9a6',
  'white gold': '#f5f0e1',
  'polished gold': '#C9A227',
  'antique gold': '#b8860b',
  'traditional gold': '#C9A227',
  champagne: '#f7e7ce',
};

const DEFAULT_NEUTRAL = '#d1d5db';
const SORTED_KEYS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);

export function resolveColorHex(color) {
  if (!color) return DEFAULT_NEUTRAL;
  const trimmed = String(color).trim();
  if (!trimmed) return DEFAULT_NEUTRAL;
  if (trimmed.startsWith('#')) return trimmed;
  if (/^[0-9A-Fa-f]{3}$/.test(trimmed) || /^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  const lower = trimmed.toLowerCase();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) return COLOR_MAP[key];
  }
  return DEFAULT_NEUTRAL;
}

export default resolveColorHex;
