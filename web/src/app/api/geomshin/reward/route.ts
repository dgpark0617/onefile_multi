import { NextRequest, NextResponse } from 'next/server';
import { rewardInk } from '@/lib/geomshin/store';

/** 리워드 광고 시청 스텁 — 즉시 잉크 충전 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  const amount = Number(body.amount ?? 5);
  const out = rewardInk(userId, amount);
  return NextResponse.json(out);
}
