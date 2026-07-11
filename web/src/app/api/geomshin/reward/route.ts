import { NextRequest, NextResponse } from 'next/server';
import { rewardInkAsync } from '@/lib/geomshin/store';
import { readUserId } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = readUserId(req, body);
  try {
    return NextResponse.json(await rewardInkAsync(userId, Number(body.amount ?? 5)));
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
