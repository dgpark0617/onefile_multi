import { NextRequest, NextResponse } from 'next/server';
import { ensureUser, userPublic } from '@/lib/geomshin/store';
import { validatePlayerId } from '@/lib/geomshin/session';

/**
 * POST /api/geomshin/session
 * 비밀번호 없이 아이디로 입장. 없으면 생성, 있으면 기존 유저 반환.
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; displayName?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const raw = String(body.userId || req.headers.get('x-user-id') || '');
  const checked = validatePlayerId(raw);
  if (!checked.ok) {
    return NextResponse.json({ ok: false, reason: checked.reason }, { status: 400 });
  }
  const name = body.displayName ? String(body.displayName).trim().slice(0, 24) : undefined;
  const u = ensureUser(checked.id, name || checked.id);
  if (name && name !== u.displayName) {
    u.displayName = name;
  }
  return NextResponse.json({
    ok: true,
    user: userPublic(u),
    note: '비밀번호 없음 · 같은 아이디면 같은 시민으로 이어집니다',
  });
}
