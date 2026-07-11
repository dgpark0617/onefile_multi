import { NextRequest, NextResponse } from 'next/server';
import { rewardInkAsync } from '@/lib/geomshin/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  const amount = Number(body.amount ?? 5);
  try {
    const out = await rewardInkAsync(userId, amount);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
