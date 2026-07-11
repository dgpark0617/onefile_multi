import { GRID_W, GRID_H, idx } from './config';

/** 완정역·중심 등 잠금 랜드마크 (일반 유저 칠 수 없음) */
export type Landmark = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const LANDMARKS: Landmark[] = [
  { id: 'wanjeong', label: '완정역', x: 120, y: 200, w: 8, h: 8 },
  { id: 'geomdan', label: '검단중앙', x: 246, y: 246, w: 10, h: 10 },
  { id: 'header', label: '헤더스팟', x: 200, y: 40, w: 100, h: 6 },
];

const locked = new Uint8Array(GRID_W * GRID_H);

function bake() {
  locked.fill(0);
  for (const lm of LANDMARKS) {
    for (let dy = 0; dy < lm.h; dy++) {
      for (let dx = 0; dx < lm.w; dx++) {
        const x = lm.x + dx;
        const y = lm.y + dy;
        if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) {
          locked[idx(x, y)] = 1;
        }
      }
    }
  }
}
bake();

export function isLandmarkLocked(i: number): boolean {
  return locked[i] === 1;
}

export function isLandmarkLockedXY(x: number, y: number): boolean {
  return isLandmarkLocked(idx(x, y));
}
