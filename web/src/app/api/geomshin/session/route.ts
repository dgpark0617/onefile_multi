import { NextRequest, NextResponse } from 'next/server';
import { ensureUserAsync, userPublic } from '@/lib/geomshin/store';
import { validatePlayerId } from '@/lib/geomshin/session';
import { readUserId } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  let body: { userId?: string; displayName?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const raw = readUserId(req, body);
  const checked = validatePlayerId(raw === 'guest' ? '' : raw);
  if (!checked.ok) {
    return NextResponse.json({ ok: false, reason: checked.reason }, { status: 400 });
  }
  const name = body.displayName ? String(body.displayName).trim().slice(0, 24) : undefined;
  try {
    const u = await ensureUserAsync(checked.id, name || checked.id);
    return NextResponse.json({
      ok: true,
      user: userPublic(u),
      note: '비밀번호 없음 · 같은 아이디면 같은 시민으로 이어집니다',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'DB_NOT_READY',
        detail: e instanceof Error ? e.message : String(e),
        hint: 'Supabase SQL Editor에서 supabase-schema.sql 실행',
      },
      { status: 503 },
    );
  }
}
