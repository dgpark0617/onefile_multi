import { NextRequest, NextResponse } from 'next/server';
import { lngLatToCell } from '@/lib/geomshin/geo';
import { recordPresence, presenceSummary } from '@/lib/geomshin/presence';
import { applyGeoPresenceAsync, userPublic } from '@/lib/geomshin/store';
import { requireApiUser } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }
  const body = (await req.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
  };
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, reason: 'BAD_COORDS' }, { status: 400 });
  }

  const cell = lngLatToCell(lng, lat);
  const onsite = cell != null;
  const now = Date.now();
  try {
    const u = await applyGeoPresenceAsync(auth.user.id, {
      lng,
      lat,
      x: cell?.x ?? null,
      y: cell?.y ?? null,
      onsite,
    });

    recordPresence({
      userId: auth.user.id,
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

export async function GET() {
  return NextResponse.json({ ok: true, summary: presenceSummary() });
}
