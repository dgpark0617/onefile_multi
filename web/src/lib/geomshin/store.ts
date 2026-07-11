import { GRID_SIZE, GRID_W, GRID_H, INK_START, idx } from './config';
import { INK_REFILL_MS_ONSITE, INK_REFILL_MS_REMOTE } from './geo';
import { refillInk, spendInk } from './ink';
import { isAdjacentOwned } from './grid';
import { isLandmarkLocked } from './landmarks';
import { parseBrushColor } from './palette';
import {
  allocSlotFromDb,
  hydrateGeomShinFromDb,
  persistPixel,
  persistUser,
  useSupabaseStore,
} from './persist';

/** GPS 미갱신 시 현장 버프 만료 (집관으로 복귀) */
export const ONSITE_STALE_MS = 10 * 60 * 1000;

export type UserRecord = {
  id: string;
  slot: number;
  displayName: string;
  ink: number;
  lastInkAtMs: number;
  seeded: boolean;
  blocked: boolean;
  brushColor: number;
  homeX: number;
  homeY: number;
  /** 검단 bbox 안 GPS 확인됨 */
  onsite: boolean;
  lastGeoAtMs: number;
  geoX: number;
  geoY: number;
};

export type PixelDelta = {
  i: number;
  x: number;
  y: number;
  ownerSlot: number;
  color: number;
  lockUntilMs: number;
  hasAd: boolean;
};

type GeomStore = {
  owners: Uint32Array;
  colors: Uint32Array;
  lockUntil: Float64Array;
  hasAd: Uint8Array;
  usersById: Map<string, UserRecord>;
  slotToUser: Map<number, string>;
  nextSlot: number;
  version: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __geomshinStore: GeomStore | undefined;
  // eslint-disable-next-line no-var
  var __geomshinReady: Promise<void> | undefined;
}

function createStore(): GeomStore {
  return {
    owners: new Uint32Array(GRID_SIZE),
    colors: new Uint32Array(GRID_SIZE),
    lockUntil: new Float64Array(GRID_SIZE),
    hasAd: new Uint8Array(GRID_SIZE),
    usersById: new Map(),
    slotToUser: new Map(),
    nextSlot: 1,
    version: 1,
  };
}

export function getStore(): GeomStore {
  if (!globalThis.__geomshinStore) {
    globalThis.__geomshinStore = createStore();
  }
  return globalThis.__geomshinStore;
}

export function resetStoreForTests(): void {
  globalThis.__geomshinStore = createStore();
  globalThis.__geomshinReady = undefined;
}

/** API 진입 시 1회 DB 하이드레이트 */
export async function ensureGeomShinReady(): Promise<void> {
  if (!useSupabaseStore()) return;
  if (!globalThis.__geomshinReady) {
    globalThis.__geomshinReady = (async () => {
      const store = getStore();
      const result = await hydrateGeomShinFromDb((users, pixels, nextSlot) => {
        store.usersById.clear();
        store.slotToUser.clear();
        store.owners.fill(0);
        store.colors.fill(0);
        store.lockUntil.fill(0);
        store.hasAd.fill(0);
        for (const u of users) {
          store.usersById.set(u.id, u);
          store.slotToUser.set(u.slot, u.id);
        }
        for (const p of pixels) {
          if (p.i < 0 || p.i >= GRID_SIZE) continue;
          store.owners[p.i] = p.owner_slot >>> 0;
          store.colors[p.i] = p.color >>> 0;
          store.lockUntil[p.i] = Number(p.lock_until_ms) || 0;
          store.hasAd[p.i] = p.has_ad ? 1 : 0;
        }
        store.nextSlot = nextSlot;
        store.version += 1;
      });
      if (!result.ok) {
        console.error('[geomshin] hydrate failed:', result.reason);
        // 테이블 미생성 등이면 메모리로 계속 (로컬 개발 편의)
        globalThis.__geomshinReady = undefined;
        throw new Error(result.reason || 'hydrate failed');
      }
    })();
  }
  await globalThis.__geomshinReady;
}

export function ensureUser(userId: string, displayName?: string): UserRecord {
  const store = getStore();
  let u = store.usersById.get(userId);
  if (u) {
    if (u.brushColor == null) u.brushColor = 0x22c55e;
    if (u.onsite == null) u.onsite = false;
    if (u.lastGeoAtMs == null) u.lastGeoAtMs = 0;
    if (u.geoX == null) u.geoX = -1;
    if (u.geoY == null) u.geoY = -1;
    if (u.homeX == null) u.homeX = -1;
    if (u.homeY == null) u.homeY = -1;
    if (displayName && displayName !== u.displayName) u.displayName = displayName;
    repairHomeFromBoard(u);
    return u;
  }
  const slot = store.nextSlot++;
  u = {
    id: userId,
    slot,
    displayName: displayName || `시민-${slot}`,
    ink: INK_START,
    lastInkAtMs: Date.now(),
    seeded: false,
    blocked: false,
    brushColor: 0x22c55e,
    homeX: -1,
    homeY: -1,
    onsite: false,
    lastGeoAtMs: 0,
    geoX: -1,
    geoY: -1,
  };
  store.usersById.set(userId, u);
  store.slotToUser.set(slot, userId);
  return u;
}

/** Supabase 사용 시 슬롯을 DB에서 원자 발급 */
export async function ensureUserAsync(
  userId: string,
  displayName?: string,
): Promise<UserRecord> {
  await ensureGeomShinReady();
  const store = getStore();
  const existing = store.usersById.get(userId);
  if (existing) {
    const u = ensureUser(userId, displayName);
    await persistUser(u);
    return u;
  }
  if (useSupabaseStore()) {
    const slot = await allocSlotFromDb();
    if (slot != null && slot > 0) {
      const u: UserRecord = {
        id: userId,
        slot,
        displayName: displayName || `시민-${slot}`,
        ink: INK_START,
        lastInkAtMs: Date.now(),
        seeded: false,
        blocked: false,
        brushColor: 0x22c55e,
        homeX: -1,
        homeY: -1,
        onsite: false,
        lastGeoAtMs: 0,
        geoX: -1,
        geoY: -1,
      };
      store.usersById.set(userId, u);
      store.slotToUser.set(slot, userId);
      if (slot >= store.nextSlot) store.nextSlot = slot + 1;
      await persistUser(u);
      return u;
    }
  }
  const u = ensureUser(userId, displayName);
  await persistUser(u);
  return u;
}

async function saveUserById(userId: string) {
  const full = getStore().usersById.get(userId);
  if (full) await persistUser(full);
}

async function saveDelta(delta?: PixelDelta | null) {
  if (delta) await persistPixel(delta);
}

/** seeded인데 home 유실된 경우 — 보드에서 내 칸을 찾아 복구 */
export function repairHomeFromBoard(u: UserRecord): UserRecord {
  if (u.homeX >= 0 && u.homeY >= 0) {
    const i = idx(u.homeX, u.homeY);
    if (getStore().owners[i] === u.slot) return u;
  }
  const store = getStore();
  for (let i = 0; i < store.owners.length; i++) {
    if (store.owners[i] === u.slot) {
      const x = i % GRID_W;
      const y = Math.floor(i / GRID_W);
      u.homeX = x;
      u.homeY = y;
      u.seeded = true;
      return u;
    }
  }
  return u;
}

export function isOnsiteActive(u: UserRecord, nowMs = Date.now()): boolean {
  if (!u.onsite) return false;
  if (!u.lastGeoAtMs) return false;
  return nowMs - u.lastGeoAtMs <= ONSITE_STALE_MS;
}

export function refillMsFor(u: UserRecord, nowMs = Date.now()): number {
  return isOnsiteActive(u, nowMs) ? INK_REFILL_MS_ONSITE : INK_REFILL_MS_REMOTE;
}

export function syncUserInk(u: UserRecord, nowMs = Date.now()): UserRecord {
  const filled = refillInk(
    { ink: u.ink, lastInkAtMs: u.lastInkAtMs },
    nowMs,
    refillMsFor(u, nowMs),
  );
  u.ink = filled.ink;
  u.lastInkAtMs = filled.lastInkAtMs;
  return u;
}

/** GPS 보고: 검단 안이면 현장 버프, 밖이면 집관 */
export function applyGeoPresence(
  userId: string,
  opts: { lng: number; lat: number; x: number | null; y: number | null; onsite: boolean },
  nowMs = Date.now(),
): UserRecord {
  const u = ensureUser(userId);
  syncUserInk(u, nowMs);
  u.onsite = opts.onsite;
  u.lastGeoAtMs = nowMs;
  u.geoX = opts.x ?? -1;
  u.geoY = opts.y ?? -1;
  return u;
}

export function setBrushColor(userId: string, color: unknown) {
  const u = ensureUser(userId);
  u.brushColor = parseBrushColor(color, u.brushColor);
  return { ok: true, user: userPublic(u) };
}

export function userPublic(u: UserRecord, nowMs = Date.now()) {
  syncUserInk(u, nowMs);
  const onsite = isOnsiteActive(u, nowMs);
  return {
    id: u.id,
    slot: u.slot,
    displayName: u.displayName,
    ink: u.ink,
    lastInkAtMs: u.lastInkAtMs,
    seeded: u.seeded,
    blocked: u.blocked,
    brushColor: u.brushColor ?? 0x22c55e,
    homeX: u.homeX ?? -1,
    homeY: u.homeY ?? -1,
    onsite,
    geoMode: onsite ? ('onsite' as const) : ('remote' as const),
    refillMs: refillMsFor(u, nowMs),
    geoX: u.geoX ?? -1,
    geoY: u.geoY ?? -1,
  };
}

function cellDelta(i: number): PixelDelta {
  const store = getStore();
  const y = Math.floor(i / GRID_W);
  const x = i % GRID_W;
  return {
    i,
    x,
    y,
    ownerSlot: store.owners[i],
    color: store.colors[i],
    lockUntilMs: store.lockUntil[i],
    hasAd: store.hasAd[i] === 1,
  };
}

export function getViewportDelta(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { version: number; w: number; h: number; cells: PixelDelta[] } {
  const store = getStore();
  const cells: PixelDelta[] = [];
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(GRID_W - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(GRID_H - 1, Math.max(y0, y1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = idx(x, y);
      if (store.owners[i] || store.hasAd[i] || isLandmarkLocked(i)) {
        cells.push(cellDelta(i));
      }
    }
  }
  return { version: store.version, w: GRID_W, h: GRID_H, cells };
}

function resolveColor(u: UserRecord, color?: unknown): number {
  if (color !== undefined && color !== null && color !== '') {
    u.brushColor = parseBrushColor(color, u.brushColor);
  }
  return u.brushColor ?? 0x22c55e;
}

export function seedPixel(
  userId: string,
  x: number,
  y: number,
  color?: unknown,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; delta?: PixelDelta; user?: ReturnType<typeof userPublic> } {
  const store = getStore();
  const u = ensureUser(userId);
  if (u.blocked) return { ok: false, reason: 'BLOCKED' };
  if (u.seeded) return { ok: false, reason: 'ALREADY_SEEDED' };
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return { ok: false, reason: 'OOB' };
  const i = idx(x, y);
  if (isLandmarkLocked(i)) return { ok: false, reason: 'LANDMARK' };
  if (store.owners[i] !== 0) return { ok: false, reason: 'OCCUPIED' };

  const spent = spendInk(
    { ink: u.ink, lastInkAtMs: u.lastInkAtMs },
    1,
    nowMs,
    refillMsFor(u, nowMs),
  );
  if (!spent.ok) return { ok: false, reason: 'NO_INK', user: userPublic(u, nowMs) };

  const brush = resolveColor(u, color);
  u.ink = spent.ink;
  u.lastInkAtMs = spent.lastInkAtMs;
  u.seeded = true;
  u.homeX = x;
  u.homeY = y;
  store.owners[i] = u.slot;
  store.colors[i] = brush;
  store.version++;
  return { ok: true, delta: cellDelta(i), user: userPublic(u, nowMs) };
}

/** 빈 칸·비랜드마크에 랜덤 시작점 */
export function autoSeedPixel(
  userId: string,
  color?: unknown,
  nowMs = Date.now(),
  rng = Math.random,
): { ok: boolean; reason?: string; delta?: PixelDelta; user?: ReturnType<typeof userPublic> } {
  const u = ensureUser(userId);
  repairHomeFromBoard(u);
  if (u.seeded) {
    return {
      ok: true,
      delta: u.homeX >= 0 ? cellDelta(idx(u.homeX, u.homeY)) : undefined,
      user: userPublic(u, nowMs),
    };
  }
  for (let t = 0; t < 4000; t++) {
    const x = Math.floor(rng() * GRID_W);
    const y = Math.floor(rng() * GRID_H);
    const i = idx(x, y);
    if (isLandmarkLocked(i)) continue;
    if (getStore().owners[i] !== 0) continue;
    return seedPixel(userId, x, y, color, nowMs);
  }
  return { ok: false, reason: 'NO_EMPTY' };
}

/**
 * 인접 확장 칠하기.
 * - 동기화: 서버 도착 순서대로 덮어쓰기(LWW). 별도 충돌 판정 UI 없음.
 * - 코팅(lock)된 칸만 덮어쓰기 거부.
 */
export function claimPixel(
  userId: string,
  x: number,
  y: number,
  color?: unknown,
  nowMs = Date.now(),
): {
  ok: boolean;
  reason?: string;
  delta?: PixelDelta;
  user?: ReturnType<typeof userPublic>;
  kind?: string;
} {
  const store = getStore();
  const u = ensureUser(userId);
  repairHomeFromBoard(u);
  syncUserInk(u, nowMs);
  if (u.blocked) return { ok: false, reason: 'BLOCKED' };
  if (!u.seeded) return { ok: false, reason: 'NEED_SEED' };
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return { ok: false, reason: 'OOB' };
  const i = idx(x, y);
  if (isLandmarkLocked(i)) return { ok: false, reason: 'LANDMARK' };

  const brush = resolveColor(u, color);

  if (store.owners[i] === u.slot) {
    store.colors[i] = brush;
    store.version++;
    return { ok: true, kind: 'RECOLOR', delta: cellDelta(i), user: userPublic(u, nowMs) };
  }

  if (store.lockUntil[i] > nowMs) {
    return { ok: false, reason: 'LOCKED' };
  }
  if (!isAdjacentOwned(store.owners, u.slot, x, y)) {
    return { ok: false, reason: 'NOT_ADJACENT' };
  }

  const spent = spendInk(
    { ink: u.ink, lastInkAtMs: u.lastInkAtMs },
    1,
    nowMs,
    refillMsFor(u, nowMs),
  );
  if (!spent.ok) return { ok: false, reason: 'NO_INK', user: userPublic(u, nowMs) };

  u.ink = spent.ink;
  u.lastInkAtMs = spent.lastInkAtMs;
  store.owners[i] = u.slot;
  store.colors[i] = brush;
  store.version++;
  return { ok: true, kind: 'CLAIM', delta: cellDelta(i), user: userPublic(u, nowMs) };
}

export function applyLockCoat(userId: string, x: number, y: number, nowMs = Date.now()) {
  const store = getStore();
  const u = ensureUser(userId);
  const i = idx(x, y);
  if (store.owners[i] !== u.slot) return { ok: false, reason: 'NOT_OWNER' };
  store.lockUntil[i] = nowMs + 24 * 60 * 60 * 1000;
  store.version++;
  return { ok: true, delta: cellDelta(i) };
}

export function rewardInk(userId: string, amount = 5, nowMs = Date.now()) {
  const u = ensureUser(userId);
  syncUserInk(u, nowMs);
  u.ink = Math.min(200, u.ink + amount);
  return { ok: true, user: userPublic(u, nowMs) };
}

export function adminClearCell(x: number, y: number) {
  const store = getStore();
  const i = idx(x, y);
  store.owners[i] = 0;
  store.colors[i] = 0;
  store.lockUntil[i] = 0;
  store.hasAd[i] = 0;
  store.version++;
  return { ok: true, delta: cellDelta(i) };
}

export function adminBlockUser(userId: string, blocked = true) {
  const u = ensureUser(userId);
  u.blocked = blocked;
  return { ok: true, user: userPublic(u) };
}

export function setAdFlag(x: number, y: number, on: boolean) {
  const store = getStore();
  store.hasAd[idx(x, y)] = on ? 1 : 0;
  store.version++;
  return { ok: true, delta: cellDelta(idx(x, y)) };
}

export function boardMeta() {
  return { w: GRID_W, h: GRID_H, size: GRID_SIZE, version: getStore().version };
}

/** —— API용 async (하이드레이트 + 영속화) —— */

export async function seedPixelAsync(
  userId: string,
  x: number,
  y: number,
  color?: unknown,
) {
  await ensureUserAsync(userId);
  const out = seedPixel(userId, x, y, color);
  await saveUserById(userId);
  await saveDelta(out.delta);
  return out;
}

export async function autoSeedPixelAsync(userId: string, color?: unknown) {
  await ensureUserAsync(userId);
  const out = autoSeedPixel(userId, color);
  await saveUserById(userId);
  await saveDelta(out.delta);
  return out;
}

export async function claimPixelAsync(
  userId: string,
  x: number,
  y: number,
  color?: unknown,
) {
  await ensureUserAsync(userId);
  const out = claimPixel(userId, x, y, color);
  await saveUserById(userId);
  await saveDelta(out.delta);
  return out;
}

export async function rewardInkAsync(userId: string, amount = 5) {
  await ensureUserAsync(userId);
  const out = rewardInk(userId, amount);
  await saveUserById(userId);
  return out;
}

export async function setBrushColorAsync(userId: string, color: unknown) {
  await ensureUserAsync(userId);
  const out = setBrushColor(userId, color);
  await saveUserById(userId);
  return out;
}

export async function applyGeoPresenceAsync(
  userId: string,
  opts: { lng: number; lat: number; x: number | null; y: number | null; onsite: boolean },
) {
  await ensureUserAsync(userId);
  const u = applyGeoPresence(userId, opts);
  await persistUser(u);
  return u;
}

export async function applyLockCoatAsync(userId: string, x: number, y: number) {
  await ensureUserAsync(userId);
  const out = applyLockCoat(userId, x, y);
  if (out.ok && out.delta) await saveDelta(out.delta);
  return out;
}

export async function adminBlockUserAsync(userId: string, blocked = true) {
  await ensureUserAsync(userId);
  const out = adminBlockUser(userId, blocked);
  await saveUserById(userId);
  return out;
}

export async function adminClearCellAsync(x: number, y: number) {
  await ensureGeomShinReady();
  const out = adminClearCell(x, y);
  await saveDelta(out.delta);
  return out;
}

export async function setAdFlagAsync(x: number, y: number, on: boolean) {
  await ensureGeomShinReady();
  const out = setAdFlag(x, y, on);
  await saveDelta(out.delta);
  return out;
}

export async function getViewportDeltaAsync(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  await ensureGeomShinReady();
  return getViewportDelta(x0, y0, x1, y1);
}
