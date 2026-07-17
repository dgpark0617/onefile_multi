import type { ComicMsg, Shot } from './types';

export type ActorFacing = 'left' | 'right';
export type ActorSide = 'left' | 'center' | 'right';

/** 패널 테두리와 말풍선을 한 덩어리로 붙일 방향 */
export type BalloonAttach = 'left' | 'right' | 'top';

/** Comic Chat PlaceBalloons·패널 줌 근사 */
export type PlacedActor = {
  lineId: string;
  side: ActorSide;
  facing: ActorFacing;
  row: number;
  zIndex: number;
  translateY: number;
  balloonMaxWidth: string;
  balloonAttach: BalloonAttach[];
  balloonCompact: boolean;
};

const SHOT_ZOOM: Record<Shot, number> = {
  close: 1.12,
  medium: 1,
  wide: 0.88,
  low: 1.06,
  high: 0.94,
};

export function panelZoom(shot: Shot): number {
  return SHOT_ZOOM[shot];
}

function balloonWeight(line: ComicMsg): number {
  let w = line.text.length;
  if (line.bubble === 'shout') w += 48;
  if (line.bubble === 'thought') w += 12;
  return w;
}

function sideForIndex(n: number, i: number): ActorSide {
  if (n === 1) return 'center';
  if (n === 2) return i === 0 ? 'left' : 'right';
  if (n === 3) return (['left', 'center', 'right'] as const)[i] ?? 'center';
  // 4–5명: 2열 그리드
  return i % 2 === 0 ? 'left' : 'right';
}

function facingFor(side: ActorSide, n: number, i: number): ActorFacing {
  if (side === 'center') return n >= 3 && i === 1 ? 'right' : 'left';
  if (side === 'left') return 'right';
  return 'left';
}

function rowFor(n: number, i: number): number {
  if (n <= 3) return 0;
  return i >= 2 ? 1 : 0;
}

function staggerY(n: number, i: number, bubble: ComicMsg['bubble']): number {
  let y = 0;
  if (n >= 3 && i % 2 === 1) y -= 6;
  if (n >= 4 && rowFor(n, i) === 1) y -= 10;
  if (bubble === 'shout') y -= 4;
  return y;
}

function balloonWidth(n: number, totalChars: number, line: ComicMsg): string {
  const long = line.text.length > 72;
  if (line.bubble === 'shout') return n >= 3 ? '64%' : '70%';
  if (long || totalChars > 180) return '62%';
  if (totalChars > 120) return '68%';
  if (n >= 4) return '72%';
  if (n === 3) return '76%';
  return line.text.length > 48 ? '78%' : '84%';
}

function balloonAttach(side: ActorSide, line: ComicMsg, n: number): BalloonAttach[] {
  const attach: BalloonAttach[] = [];
  if (n >= 2) {
    if (side === 'left') attach.push('left');
    if (side === 'right') attach.push('right');
  }
  if (line.bubble === 'shout' || line.text.length > 64 || n === 1) {
    attach.push('top');
  }
  return attach;
}

function balloonCompact(line: ComicMsg): boolean {
  return line.text.length > 96 || line.bubble === 'shout';
}

/** 말풍선·캐릭터 겹침 완화 — 슬롯·시선·z-index */
export function placeActors(lines: ComicMsg[]): PlacedActor[] {
  const n = lines.length;
  if (n === 0) return [];

  const weights = lines.map(balloonWeight);
  const maxW = Math.max(...weights);
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0);

  return lines.map((line, i) => {
    const side = sideForIndex(n, i);
    const facing = facingFor(side, n, i);
    const row = rowFor(n, i);
    const zIndex = 12 + (weights[i] === maxW ? 3 : 0) + (n - i);

    return {
      lineId: line.id,
      side,
      facing,
      row,
      zIndex,
      translateY: staggerY(n, i, line.bubble),
      balloonMaxWidth: balloonWidth(n, totalChars, line),
      balloonAttach: balloonAttach(side, line, n),
      balloonCompact: balloonCompact(line),
    };
  });
}
