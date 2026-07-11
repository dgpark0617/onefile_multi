import { NextRequest, NextResponse } from 'next/server';
import { rewardInkAsync } from '@/lib/geomshin/store';
import { requireApiUser } from '@/lib/geomshin/requestUser';

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await rewardInkAsync(auth.user.id, Number(body.amount ?? 5)));
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
