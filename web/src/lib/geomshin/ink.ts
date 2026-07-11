import { INK_CAP, INK_REFILL_MS } from './config';

export type InkState = {
  ink: number;
  lastInkAtMs: number;
};

/** 경과 시간만큼 잉크 충전 (cap 적용). refillMs로 집관/현장 속도 분리 */
export function refillInk(
  state: InkState,
  nowMs: number,
  refillMs: number = INK_REFILL_MS,
): InkState {
  const step = Math.max(1000, refillMs);
  if (nowMs <= state.lastInkAtMs) return { ...state };
  const gained = Math.floor((nowMs - state.lastInkAtMs) / step);
  if (gained <= 0) return { ...state };
  const ink = Math.min(INK_CAP, state.ink + gained);
  const lastInkAtMs = state.lastInkAtMs + gained * step;
  return { ink, lastInkAtMs };
}

export function spendInk(
  state: InkState,
  cost: number,
  nowMs: number,
  refillMs: number = INK_REFILL_MS,
): InkState & { ok: boolean } {
  const filled = refillInk(state, nowMs, refillMs);
  if (filled.ink < cost) return { ...filled, ok: false };
  return { ink: filled.ink - cost, lastInkAtMs: filled.lastInkAtMs, ok: true };
}

export function msUntilNextInk(
  state: InkState,
  nowMs: number,
  refillMs: number = INK_REFILL_MS,
): number {
  const step = Math.max(1000, refillMs);
  const filled = refillInk(state, nowMs, step);
  if (filled.ink >= INK_CAP) return 0;
  const elapsed = nowMs - filled.lastInkAtMs;
  return Math.max(0, step - elapsed);
}
