/**
 * 기간 한정 오프라인 QR (만원의 행복)
 * - 발급 시 +7일 만료
 * - 스캔 시 잉크 대량 충전 (유저당 코드 1회)
 * - 결제 연동은 스텁 (토스/카카오 후속)
 */
export const QR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const QR_DEFAULT_INK = 30;
export const QR_PRICE_KRW_STUB = 10000;

export type QrOffer = {
  id: string;
  shopName: string;
  inkReward: number;
  createdAtMs: number;
  expiresAtMs: number;
  /** 이미 사용한 userId */
  redeemed: Set<string>;
  kind: 'shop' | 'rider_pickup' | 'attendance';
};

type QrStore = {
  byId: Map<string, QrOffer>;
};

declare global {
  // eslint-disable-next-line no-var
  var __geomshinQr: QrStore | undefined;
}

function getQrStore(): QrStore {
  if (!globalThis.__geomshinQr) {
    globalThis.__geomshinQr = { byId: new Map() };
  }
  return globalThis.__geomshinQr;
}

function newId(): string {
  return `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createQrOffer(opts: {
  shopName: string;
  inkReward?: number;
  kind?: QrOffer['kind'];
  nowMs?: number;
}): { ok: true; offer: Omit<QrOffer, 'redeemed'> & { redeemPath: string } } {
  const now = opts.nowMs ?? Date.now();
  const id = newId();
  const offer: QrOffer = {
    id,
    shopName: opts.shopName || '검단 가게',
    inkReward: opts.inkReward ?? QR_DEFAULT_INK,
    createdAtMs: now,
    expiresAtMs: now + QR_TTL_MS,
    redeemed: new Set(),
    kind: opts.kind ?? 'shop',
  };
  getQrStore().byId.set(id, offer);
  return {
    ok: true,
    offer: {
      id: offer.id,
      shopName: offer.shopName,
      inkReward: offer.inkReward,
      createdAtMs: offer.createdAtMs,
      expiresAtMs: offer.expiresAtMs,
      kind: offer.kind,
      redeemPath: `/geomshin/qr/${id}`,
    },
  };
}

export function getQrOffer(id: string): QrOffer | null {
  return getQrStore().byId.get(id) ?? null;
}

export function redeemQr(
  id: string,
  userId: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; inkReward?: number; shopName?: string } {
  const offer = getQrOffer(id);
  if (!offer) return { ok: false, reason: 'QR_NOT_FOUND' };
  if (nowMs > offer.expiresAtMs) return { ok: false, reason: 'QR_EXPIRED' };
  if (offer.redeemed.has(userId)) return { ok: false, reason: 'QR_ALREADY_USED' };
  offer.redeemed.add(userId);
  return {
    ok: true,
    inkReward: offer.inkReward,
    shopName: offer.shopName,
  };
}

export function resetQrForTests(): void {
  globalThis.__geomshinQr = { byId: new Map() };
}
