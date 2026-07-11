import { NextRequest, NextResponse } from 'next/server';
import { ensureUserAsync, userPublic } from '@/lib/geomshin/store';
import { validateDisplayName } from '@/lib/geomshin/session';
import { requireApiUser } from '@/lib/geomshin/requestUser';

/** POST /api/geomshin/session — Bearer 필수, userId=auth.uid */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  let body: { displayName?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let displayName = auth.user.displayNameHint || '';
  if (body.displayName) {
    const n = validateDisplayName(String(body.displayName));
    if (n.ok) displayName = n.id;
  }
  if (!displayName) {
    displayName = auth.user.email?.split('@')[0] || `시민-${auth.user.id.slice(0, 6)}`;
  }

  try {
    const u = await ensureUserAsync(auth.user.id, displayName);
    if (displayName && u.displayName !== displayName) {
      u.displayName = displayName;
    }
    return NextResponse.json({
      ok: true,
      user: userPublic(u),
      note: 'Supabase Auth · 계정에 영토가 묶입니다',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'DB_NOT_READY',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 503 },
    );
  }
}
