import { GRID_H, GRID_W, inBounds, idx } from './config';

const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** 상하좌우 인접 인덱스 */
export function neighbors4(x: number, y: number): number[] {
  const out: number[] = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny)) out.push(idx(nx, ny));
  }
  return out;
}

export function isAdjacentOwned(
  owners: Uint32Array,
  userSlot: number,
  x: number,
  y: number,
): boolean {
  for (const i of neighbors4(x, y)) {
    if (owners[i] === userSlot) return true;
  }
  return false;
}

export { GRID_W, GRID_H, idx, inBounds };
