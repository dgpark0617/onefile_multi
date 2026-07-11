import { NextRequest, NextResponse } from 'next/server';
import { adminBlockUser, adminClearCell, setAdFlag } from '@/lib/geomshin/store';

/** 관리자 스텁 — 좌표 초기화·유저 차단·광고 플래그 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  if (action === 'clear') {
    return NextResponse.json(adminClearCell(Number(body.x), Number(body.y)));
  }
  if (action === 'block') {
    return NextResponse.json(adminBlockUser(String(body.userId), body.blocked !== false));
  }
  if (action === 'ad') {
    return NextResponse.json(setAdFlag(Number(body.x), Number(body.y), !!body.on));
  }
  return NextResponse.json({ ok: false, reason: 'UNKNOWN_ACTION' }, { status: 400 });
}
