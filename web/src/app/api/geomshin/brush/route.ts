import { NextRequest, NextResponse } from 'next/server';
import { setBrushColorAsync } from '@/lib/geomshin/store';
import { readUserId } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = readUserId(req, body);
  try {
    return NextResponse.json(await setBrushColorAsync(userId, body.color));
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
