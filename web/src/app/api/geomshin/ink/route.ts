import { NextRequest, NextResponse } from 'next/server';
import { ensureUser, userPublic, boardMeta, refillMsFor } from '@/lib/geomshin/store';
import { TERMS } from '@/lib/geomshin/terms';
import { INK_CAP } from '@/lib/geomshin/config';
import { INK_REFILL_MS_ONSITE, INK_REFILL_MS_REMOTE } from '@/lib/geomshin/geo';
import { msUntilNextInk } from '@/lib/geomshin/ink';
import { LANDMARKS } from '@/lib/geomshin/landmarks';

function uid(req: NextRequest): string {
  return req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId') || 'guest';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  const u = ensureUser(userId);
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
  });
}
