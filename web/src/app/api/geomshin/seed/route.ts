import { NextRequest, NextResponse } from 'next/server';
import { autoSeedPixelAsync, seedPixelAsync } from '@/lib/geomshin/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  try {
    if (body.auto) {
      const out = await autoSeedPixelAsync(userId, body.color);
      return NextResponse.json(out);
    }
    const out = await seedPixelAsync(userId, Number(body.x), Number(body.y), body.color);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
