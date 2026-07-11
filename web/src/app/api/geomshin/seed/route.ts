import { NextRequest, NextResponse } from 'next/server';
import { autoSeedPixelAsync, seedPixelAsync } from '@/lib/geomshin/store';
import { requireApiUser } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }
  const body = await req.json().catch(() => ({}));
  try {
    if (body.auto) {
      return NextResponse.json(await autoSeedPixelAsync(auth.user.id, body.color));
    }
    return NextResponse.json(
      await seedPixelAsync(auth.user.id, Number(body.x), Number(body.y), body.color),
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
