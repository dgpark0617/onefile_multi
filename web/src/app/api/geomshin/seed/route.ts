import { NextRequest, NextResponse } from 'next/server';
import { autoSeedPixel, seedPixel } from '@/lib/geomshin/store';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  if (body.auto) {
    const out = autoSeedPixel(userId, body.color);
    return NextResponse.json(out, { status: out.ok ? 200 : 400 });
  }
  const out = seedPixel(userId, Number(body.x), Number(body.y), body.color);
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
