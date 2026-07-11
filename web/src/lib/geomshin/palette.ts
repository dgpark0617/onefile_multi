/** 팔레트 기본색 (그림판) */
export const PALETTE = Object.freeze([
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#78716c',
  '#14532d',
]);

/** #rrggbb 또는 숫자 → 0xRRGGBB */
export function parseBrushColor(input: unknown, fallback = 0x22c55e): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input >>> 0 & 0xffffff;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.slice(1), 16);
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
    }
    if (/^[0-9a-fA-F]{6}$/.test(s)) return parseInt(s, 16);
  }
  return fallback & 0xffffff;
}

export function colorToCss(color: number): string {
  const c = color & 0xffffff;
  return `#${c.toString(16).padStart(6, '0')}`;
}
