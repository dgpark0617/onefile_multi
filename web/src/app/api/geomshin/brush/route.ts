import { NextRequest, NextResponse } from 'next/server';
import { setBrushColor } from '@/lib/geomshin/store';
import { PALETTE } from '@/lib/geomshin/palette';

export async function GET() {
  return NextResponse.json({ palette: PALETTE });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  const out = setBrushColor(userId, body.color);
  return NextResponse.json(out);
}
