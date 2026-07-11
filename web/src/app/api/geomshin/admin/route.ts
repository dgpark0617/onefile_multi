import { NextRequest, NextResponse } from 'next/server';
import {
  adminBlockUserAsync,
  adminClearCellAsync,
  setAdFlagAsync,
} from '@/lib/geomshin/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    if (body.action === 'block') {
      return NextResponse.json(
        await adminBlockUserAsync(String(body.userId), body.blocked !== false),
      );
    }
    if (body.action === 'clear') {
      return NextResponse.json(await adminClearCellAsync(Number(body.x), Number(body.y)));
    }
    if (body.action === 'ad') {
      return NextResponse.json(
        await setAdFlagAsync(Number(body.x), Number(body.y), Boolean(body.on)),
      );
    }
    return NextResponse.json({ ok: false, reason: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'DB_NOT_READY', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
