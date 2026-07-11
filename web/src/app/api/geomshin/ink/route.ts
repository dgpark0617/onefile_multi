import { NextRequest, NextResponse } from 'next/server';
import {
  ensureUserAsync,
  userPublic,
  boardMeta,
  refillMsFor,
  ensureGeomShinReady,
} from '@/lib/geomshin/store';
import { TERMS } from '@/lib/geomshin/terms';
import { INK_CAP } from '@/lib/geomshin/config';
import { INK_REFILL_MS_ONSITE, INK_REFILL_MS_REMOTE } from '@/lib/geomshin/geo';
import { msUntilNextInk } from '@/lib/geomshin/ink';
import { LANDMARKS } from '@/lib/geomshin/landmarks';
import { getStoreBackend } from '@/lib/geomshin/backend';
import { readUserId } from '@/lib/geomshin/requestUser';

export async function GET(req: NextRequest) {
  try {
    await ensureGeomShinReady();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'DB_NOT_READY',
        detail: e instanceof Error ? e.message : String(e),
        hint: 'Supabase SQL Editor에서 web/src/lib/geomshin/supabase-schema.sql 실행',
      },
      { status: 503 },
    );
  }
  const userId = readUserId(req);
  const u = await ensureUserAsync(userId);
  const now = Date.now();
  const pub = userPublic(u, now);
  const refillMs = refillMsFor(u, now);
  return NextResponse.json({
    terms: TERMS,
    board: boardMeta(),
    inkCap: INK_CAP,
    refillMs,
    refillMsRemote: INK_REFILL_MS_REMOTE,
    refillMsOnsite: INK_REFILL_MS_ONSITE,
    msUntilNext: msUntilNextInk({ ink: pub.ink, lastInkAtMs: pub.lastInkAtMs }, now, refillMs),
    landmarks: LANDMARKS,
    user: pub,
    storeBackend: getStoreBackend(),
  });
}
