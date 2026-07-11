import { NextRequest, NextResponse } from 'next/server';
import { getViewportDelta, boardMeta } from '@/lib/geomshin/store';
import { LANDMARKS } from '@/lib/geomshin/landmarks';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const x0 = Number(sp.get('x0') ?? 0);
  const y0 = Number(sp.get('y0') ?? 0);
  const x1 = Number(sp.get('x1') ?? 64);
  const y1 = Number(sp.get('y1') ?? 64);
  const data = getViewportDelta(x0, y0, x1, y1);
  return NextResponse.json({ ...data, meta: boardMeta(), landmarks: LANDMARKS });
}
