import { getStoreBackend, supabaseConfigured } from './backend';
import { getSupabaseAdmin } from './supabaseAdmin';
import type { PixelDelta, UserRecord } from './store';
import { GRID_SIZE } from './config';

export function useSupabaseStore(): boolean {
  return getStoreBackend() === 'supabase' && supabaseConfigured();
}

type DbUser = {
  id: string;
  slot: number;
  display_name: string;
  ink: number;
  last_ink_at_ms: number;
  seeded: boolean;
  blocked: boolean;
  brush_color: number;
  home_x: number;
  home_y: number;
  onsite: boolean;
  last_geo_at_ms: number;
  geo_x: number;
  geo_y: number;
};

type DbPixel = {
  i: number;
  x: number;
  y: number;
  owner_slot: number;
  color: number;
  lock_until_ms: number;
  has_ad: boolean;
};

function userToRow(u: UserRecord): DbUser {
  return {
    id: u.id,
    slot: u.slot,
    display_name: u.displayName,
    ink: u.ink,
    last_ink_at_ms: u.lastInkAtMs,
    seeded: u.seeded,
    blocked: u.blocked,
    brush_color: u.brushColor,
    home_x: u.homeX,
    home_y: u.homeY,
    onsite: u.onsite,
    last_geo_at_ms: u.lastGeoAtMs,
    geo_x: u.geoX,
    geo_y: u.geoY,
  };
}

function rowToUser(r: DbUser): UserRecord {
  return {
    id: r.id,
    slot: r.slot,
    displayName: r.display_name,
    ink: r.ink,
    lastInkAtMs: Number(r.last_ink_at_ms),
    seeded: r.seeded,
    blocked: r.blocked,
    brushColor: r.brush_color,
    homeX: r.home_x,
    homeY: r.home_y,
    onsite: r.onsite,
    lastGeoAtMs: Number(r.last_geo_at_ms),
    geoX: r.geo_x,
    geoY: r.geo_y,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __geomshinHydrated: boolean | undefined;
  // eslint-disable-next-line no-var
  var __geomshinHydratePromise: Promise<void> | undefined;
}

/** 콜드스타트 시 DB → 메모리 1회 적재 */
export async function hydrateGeomShinFromDb(
  apply: (users: UserRecord[], pixels: DbPixel[], nextSlot: number) => void,
): Promise<{ ok: boolean; reason?: string }> {
  if (!useSupabaseStore()) return { ok: true };
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, reason: 'NO_CLIENT' };

  const [usersRes, pixelsRes, metaRes] = await Promise.all([
    sb.from('geomshin_users').select('*'),
    sb.from('geomshin_pixels').select('*'),
    sb.from('geomshin_meta').select('value').eq('key', 'next_slot').maybeSingle(),
  ]);

  if (usersRes.error) {
    return { ok: false, reason: usersRes.error.message };
  }
  if (pixelsRes.error) {
    return { ok: false, reason: pixelsRes.error.message };
  }

  const users = (usersRes.data as DbUser[] | null)?.map(rowToUser) ?? [];
  const pixels = (pixelsRes.data as DbPixel[] | null) ?? [];
  let nextSlot = Number(metaRes.data?.value ?? 1);
  if (!Number.isFinite(nextSlot) || nextSlot < 1) nextSlot = 1;
  for (const u of users) {
    if (u.slot >= nextSlot) nextSlot = u.slot + 1;
  }
  apply(users, pixels, nextSlot);
  return { ok: true };
}

export async function allocSlotFromDb(): Promise<number | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.rpc('geomshin_alloc_slot');
  if (error || data == null) {
    console.error('[geomshin] alloc_slot', error?.message);
    return null;
  }
  return Number(data);
}

export async function persistUser(u: UserRecord): Promise<void> {
  if (!useSupabaseStore()) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from('geomshin_users').upsert(userToRow(u), { onConflict: 'id' });
  if (error) console.error('[geomshin] persistUser', u.id, error.message);
}

export async function persistPixel(delta: PixelDelta): Promise<void> {
  if (!useSupabaseStore()) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  if (!delta.ownerSlot && !delta.hasAd) {
    const { error } = await sb.from('geomshin_pixels').delete().eq('i', delta.i);
    if (error) console.error('[geomshin] deletePixel', delta.i, error.message);
    return;
  }
  if (delta.i < 0 || delta.i >= GRID_SIZE) return;
  const { error } = await sb.from('geomshin_pixels').upsert(
    {
      i: delta.i,
      x: delta.x,
      y: delta.y,
      owner_slot: delta.ownerSlot,
      color: delta.color,
      lock_until_ms: delta.lockUntilMs,
      has_ad: delta.hasAd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'i' },
  );
  if (error) console.error('[geomshin] persistPixel', delta.i, error.message);
}

export async function checkGeomShinTables(): Promise<{ ok: boolean; detail: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, detail: 'supabase client missing' };
  const { error } = await sb.from('geomshin_users').select('id').limit(1);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: 'tables ok' };
}
