'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { BoardCell } from '@/game/geomshin/GeomShinScene';
import { getBrowserSupabase, isSupabaseBrowserReady } from './supabaseBrowser';

type PixelRow = {
  i?: number;
  x: number;
  y: number;
  owner_slot: number;
  color: number;
  has_ad?: boolean;
};

function rowToCell(row: PixelRow): BoardCell {
  return {
    x: Number(row.x),
    y: Number(row.y),
    color: Number(row.color) || 0,
    ownerSlot: Number(row.owner_slot) || 0,
    hasAd: Boolean(row.has_ad),
  };
}

/**
 * geomshin_pixels 변경분만 Realtime 구독.
 * 서버(service role) upsert/delete → 다른 클라에 즉시 반영.
 */
export function subscribePixelRealtime(handlers: {
  onUpsert: (cell: BoardCell) => void;
  onDelete: (xy: { x: number; y: number }) => void;
}): { unsubscribe: () => void } {
  if (!isSupabaseBrowserReady()) {
    return { unsubscribe: () => {} };
  }

  const sb = getBrowserSupabase();
  let channel: RealtimeChannel | null = sb
    .channel('geomshin-pixels-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'geomshin_pixels' },
      (payload) => {
        const row = payload.new as PixelRow;
        if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) {
          handlers.onUpsert(rowToCell(row));
        }
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'geomshin_pixels' },
      (payload) => {
        const row = payload.new as PixelRow;
        if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) {
          handlers.onUpsert(rowToCell(row));
        }
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'geomshin_pixels' },
      (payload) => {
        const row = payload.old as PixelRow;
        if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) {
          handlers.onDelete({ x: Number(row.x), y: Number(row.y) });
        }
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      if (channel) {
        void sb.removeChannel(channel);
        channel = null;
      }
    },
  };
}
