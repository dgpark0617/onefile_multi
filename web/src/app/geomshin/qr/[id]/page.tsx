'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import '../../geomshin.css';
import GeomShinNav from '../../GeomShinNav';
import { getBrowserSupabase, isSupabaseBrowserReady } from '@/lib/geomshin/supabaseBrowser';

const REASON_KO: Record<string, string> = {
  QR_NOT_FOUND: 'QR을 찾을 수 없습니다',
  QR_EXPIRED: '만료된 QR입니다 (7일)',
  QR_ALREADY_USED: '이미 사용한 QR입니다',
  UNAUTHORIZED: '로그인이 필요합니다',
};

export default function QrRedeemPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    shopName: string;
    inkReward: number;
    expiresAtMs: number;
    expired: boolean;
  } | null>(null);
  const [msg, setMsg] = useState('QR 확인 중…');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseBrowserReady()) {
      setMsg('먼저 /geomshin 에서 로그인해 주세요');
      return;
    }
    const sb = getBrowserSupabase();
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      } else {
        setMsg('먼저 /geomshin 에서 로그인해 주세요');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/geomshin/qr?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setMsg(REASON_KO[data.reason] || data.reason || '조회 실패');
          return;
        }
        setInfo(data.offer);
        setMsg(
          data.offer.expired
            ? '만료된 QR입니다'
            : `${data.offer.shopName} · 잉크 +${data.offer.inkReward}`,
        );
      });
  }, [id]);

  const redeem = async () => {
    if (!accessToken) {
      setMsg('먼저 /geomshin 에서 로그인해 주세요');
      return;
    }
    const res = await fetch('/api/geomshin/qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: 'redeem', id }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMsg(REASON_KO[data.reason] || data.reason || '충전 실패');
      return;
    }
    setDone(true);
    setMsg(
      `${data.shopName} 출석 완료 · 잉크 +${data.inkReward} → 보유 ${data.user?.ink ?? '?'}`,
    );
  };

  return (
    <div className="gs-root gs-shop">
      <header className="gs-hud">
        <div className="gs-brand">
          <strong>출석 QR</strong>
          <span>만원의 행복 · 잉크 충전</span>
        </div>
        <GeomShinNav current="/geomshin/shop" />
        <p className="gs-msg">{msg}</p>
        {!accessToken && (
          <div className="gs-actions">
            <a className="gs-link" href="/geomshin">
              로그인하러 가기
            </a>
          </div>
        )}
        {accessToken && info && !info.expired && !done && (
          <div className="gs-actions">
            <button type="button" onClick={redeem}>
              잉크 +{info.inkReward} 받기
            </button>
          </div>
        )}
      </header>
    </div>
  );
}
