import { NextRequest, NextResponse } from 'next/server';
import { getViewportDeltaAsync, boardMeta, ensureGeomShinReady } from '@/lib/geomshin/store';
import { LANDMARKS } from '@/lib/geomshin/landmarks';
import { requireApiUser } from '@/lib/geomshin/requestUser';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }
  const sp = req.nextUrl.searchParams;
  const x0 = Number(sp.get('x0') ?? 0);
  const y0 = Number(sp.get('y0') ?? 0);
  const x1 = Number(sp.get('x1') ?? 64);
  const y1 = Number(sp.get('y1') ?? 64);
  try {
    await ensureGeomShinReady();
    const data = await getViewportDeltaAsync(x0, y0, x1, y1);
    return NextResponse.json({ ...data, meta: boardMeta(), landmarks: LANDMARKS });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
