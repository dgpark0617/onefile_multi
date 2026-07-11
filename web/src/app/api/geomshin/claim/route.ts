import { NextRequest, NextResponse } from 'next/server';
import { claimPixel } from '@/lib/geomshin/store';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  const out = claimPixel(userId, Number(body.x), Number(body.y), body.color);
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
