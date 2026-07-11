/** 검신 — 격자·잉크 상수 */
export const GRID_W = 500;
export const GRID_H = 500;
export const GRID_SIZE = GRID_W * GRID_H;

/**
 * 잉크 충전
 * - 집관(원격): 5분당 1
 * - 현장(GPS 해당 격자): 1분당 1  → geo.ts INK_REFILL_MS_ONSITE
 */
export const INK_REFILL_MS = 5 * 60 * 1000;
export const INK_CAP = 200;
export const INK_START = 12;

export const CELL_PX = 16;

export function idx(x: number, y: number): number {
  return y * GRID_W + x;
}

export function xy(i: number): { x: number; y: number } {
  return { x: i % GRID_W, y: Math.floor(i / GRID_W) };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
}
