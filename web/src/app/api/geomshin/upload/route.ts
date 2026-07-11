import { NextRequest, NextResponse } from 'next/server';
import { setAdFlag } from '@/lib/geomshin/store';

/** 광고 이미지 업로드 스텁 — 플래그만 설정 (실파일은 2차) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const x = Number(body.x);
  const y = Number(body.y);
  const out = setAdFlag(x, y, true);
  return NextResponse.json({ ...out, message: '업로드 스텁 — 광고 플래그 설정됨' });
}
