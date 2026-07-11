import { NextRequest, NextResponse } from 'next/server';
import {
  createQrOffer,
  getQrOffer,
  redeemQr,
  QR_PRICE_KRW_STUB,
  QR_TTL_MS,
} from '@/lib/geomshin/qr';
import { rewardInkAsync } from '@/lib/geomshin/store';
import { requireApiUser } from '@/lib/geomshin/requestUser';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({
      ok: true,
      priceKrwStub: QR_PRICE_KRW_STUB,
      ttlMs: QR_TTL_MS,
      note: '만원의 행복 — 7일 만료 QR 발급/스캔 API',
    });
  }
  const offer = getQrOffer(id);
  if (!offer) return NextResponse.json({ ok: false, reason: 'QR_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    offer: {
      id: offer.id,
      shopName: offer.shopName,
      inkReward: offer.inkReward,
      createdAtMs: offer.createdAtMs,
      expiresAtMs: offer.expiresAtMs,
      kind: offer.kind,
      redeemPath: `/geomshin/qr/${offer.id}`,
      expired: Date.now() > offer.expiresAtMs,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    shopName?: string;
    inkReward?: number;
    kind?: 'shop' | 'rider_pickup' | 'attendance';
    id?: string;
  };
  const action = body.action || 'create';

  if (action === 'create') {
    const created = createQrOffer({
      shopName: body.shopName || '검단 가게',
      inkReward: body.inkReward,
      kind: body.kind,
    });
    return NextResponse.json({
      ok: true,
      paymentStub: {
        amountKrw: QR_PRICE_KRW_STUB,
        status: 'paid_stub',
        note: '토스/카카오페이 연동 전 — 결제 성공으로 가정',
      },
      offer: created.offer,
    });
  }

  if (action === 'redeem') {
    const auth = await requireApiUser(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
    }
    const id = body.id;
    if (!id) return NextResponse.json({ ok: false, reason: 'NO_ID' }, { status: 400 });
    const result = redeemQr(id, auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
    }
    const rewarded = await rewardInkAsync(auth.user.id, result.inkReward ?? 30);
    return NextResponse.json({
      ok: true,
      shopName: result.shopName,
      inkReward: result.inkReward,
      user: rewarded.user,
    });
  }

  return NextResponse.json({ ok: false, reason: 'BAD_ACTION' }, { status: 400 });
}
