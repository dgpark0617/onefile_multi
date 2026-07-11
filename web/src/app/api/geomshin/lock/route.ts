import { NextRequest, NextResponse } from 'next/server';
import { applyLockCoat } from '@/lib/geomshin/store';

/** 24시간 수정 잠금 코팅 스텁 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || req.headers.get('x-user-id') || 'guest');
  const x = Number(body.x);
  const y = Number(body.y);
  const out = applyLockCoat(userId, x, y);
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
