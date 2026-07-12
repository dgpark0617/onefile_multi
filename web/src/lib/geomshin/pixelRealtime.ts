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
 * accessToken 으로 Realtime JWT를 맞춰 RLS(authenticated) 통과.
 */
export function subscribePixelRealtime(
  accessToken: string,
  handlers: {
    onUpsert: (cell: BoardCell) => void;
    onDelete: (xy: { x: number; y: number }) => void;
  },
): { unsubscribe: () => void } {
  if (!isSupabaseBrowserReady() || !accessToken) {
    return { unsubscribe: () => {} };
  }

  const sb = getBrowserSupabase();
  // Realtime 소켓에 Auth JWT 전달 (RLS SELECT 정책에 필요)
  void sb.realtime.setAuth(accessToken);

  let channel: RealtimeChannel | null = sb
    .channel(`geomshin-pixels-${accessToken.slice(-8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'geomshin_pixels' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const row = payload.old as PixelRow;
          if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) {
            handlers.onDelete({ x: Number(row.x), y: Number(row.y) });
          }
          return;
        }
        const row = payload.new as PixelRow;
        if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) {
          handlers.onUpsert(rowToCell(row));
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
