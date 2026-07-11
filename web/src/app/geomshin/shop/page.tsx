'use client';

import { useState } from 'react';
import '../geomshin.css';
import GeomShinNav from '../GeomShinNav';

type Offer = {
  id: string;
  shopName: string;
  inkReward: number;
  expiresAtMs: number;
  redeemPath: string;
  kind: string;
};

export default function ShopQrPage() {
  const [shopName, setShopName] = useState('검단 학원');
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/geomshin/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          shopName,
          kind: 'shop',
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.reason || '발급 실패');
        return;
      }
      setOffer(data.offer);
    } finally {
      setBusy(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="gs-root gs-shop">
      <header className="gs-hud">
        <div className="gs-brand">
          <strong>만원의 행복 · QR 발급</strong>
          <span>₩10,000(스텁) → 7일 만료 출석 QR</span>
        </div>
        <GeomShinNav current="/geomshin/shop" />
        <p className="gs-msg">
          가게·학원에 붙여 두면 방문 유저가 스캔해 잉크를 충전합니다. 결제 연동은 스텁입니다.
        </p>
        <div className="gs-shop-form">
          <label>
            상호명
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </label>
          <button type="button" disabled={busy} onClick={create}>
            {busy ? '발급 중…' : '₩10,000 결제(스텁) 후 QR 발급'}
          </button>
        </div>
        {err && <p className="gs-msg">{err}</p>}
        {offer && (
          <div className="gs-shop-result">
            <p>
              <b>{offer.shopName}</b> · 잉크 +{offer.inkReward} · 만료{' '}
              {new Date(offer.expiresAtMs).toLocaleString('ko-KR')}
            </p>
            <p className="gs-shop-url">
              스캔 URL:{' '}
              <a href={offer.redeemPath}>
                {origin}
                {offer.redeemPath}
              </a>
            </p>
            <p className="gs-msg">이 URL을 QR 이미지로 인쇄해 매장에 배치하세요.</p>
          </div>
        )}
      </header>
    </div>
  );
}
