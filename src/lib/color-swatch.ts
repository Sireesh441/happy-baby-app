// `variantColor` (from the backend's Product.variantColor) is free text
// written by whoever named the product, e.g. "Blue Stripes" or "Charcoal
// Grey" -- not a hex code or a constrained enum. This maps the first
// recognizable color word in that text to a real color for swatch dots;
// anything unrecognized falls back to a neutral gray dot with the raw text
// still shown as the accessibility label, so nothing is ever hidden, just
// not visually colored.
const COLOR_WORD_TO_HEX: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  navy: '#1e3a8a',
  green: '#16a34a',
  olive: '#65742a',
  black: '#18181b',
  white: '#ffffff',
  pink: '#ec4899',
  yellow: '#eab308',
  gold: '#ca8a04',
  grey: '#6b7280',
  gray: '#6b7280',
  charcoal: '#374151',
  purple: '#9333ea',
  violet: '#7c3aed',
  indigo: '#4f46e5',
  orange: '#ea580c',
  brown: '#78350f',
  tan: '#c9a26d',
  khaki: '#a8a082',
  beige: '#e5decf',
  cream: '#fdf6e3',
  ivory: '#fffff0',
  maroon: '#7f1d1d',
  teal: '#0d9488',
  turquoise: '#06b6d4',
  mint: '#6ee7b7',
  lavender: '#c4b5fd',
  coral: '#fb7185',
  magenta: '#d946ef',
  silver: '#cbd5e1',
};

const DEFAULT_SWATCH_COLOR = '#9ca3af';

/** Extracts a display color from free-text like "Blue Stripes" -> #2563eb. */
export function colorNameToHex(variantColor?: string | null): string {
  if (!variantColor) return DEFAULT_SWATCH_COLOR;
  const words = variantColor.toLowerCase().split(/[^a-z]+/);
  for (const word of words) {
    if (COLOR_WORD_TO_HEX[word]) return COLOR_WORD_TO_HEX[word];
  }
  return DEFAULT_SWATCH_COLOR;
}

/** White swatches need a visible border since they'd otherwise disappear against light backgrounds. */
export function swatchNeedsBorder(hex: string): boolean {
  return hex === '#ffffff' || hex === '#fdf6e3' || hex === '#fffff0';
}
