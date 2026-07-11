import { NextRequest, NextResponse } from 'next/server';
import { lngLatToCell } from '@/lib/geomshin/geo';
import { recordPresence, presenceSummary } from '@/lib/geomshin/presence';
import { applyGeoPresenceAsync, userPublic } from '@/lib/geomshin/store';

function uid(req: NextRequest, body?: { userId?: string }): string {
  return (
    req.headers.get('x-user-id') ||
    body?.userId ||
    req.nextUrl.searchParams.get('userId') ||
    'guest'
  );
}

/** GPS 보고 → 현장/집관 + B2B 체류 로그 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    lat?: number;
    lng?: number;
  };
  const userId = uid(req, body);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, reason: 'BAD_COORDS' }, { status: 400 });
  }

  const cell = lngLatToCell(lng, lat);
  const onsite = cell != null;
  const now = Date.now();
  try {
    const u = await applyGeoPresenceAsync(userId, {
      lng,
      lat,
      x: cell?.x ?? null,
      y: cell?.y ?? null,
      onsite,
    });

    recordPresence({
      userId,
      x: cell?.x ?? -1,
      y: cell?.y ?? -1,
      lat,
      lng,
      atMs: now,
      onsite,
    });

    return NextResponse.json({
      ok: true,
      onsite,
      cell: cell ? { x: cell.x, y: cell.y } : null,
      user: userPublic(u, now),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}

/** B2B 밀집도 스텁 조회 */
export async function GET() {
  return NextResponse.json({ ok: true, summary: presenceSummary() });
}
