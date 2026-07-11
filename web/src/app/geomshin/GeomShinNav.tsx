/**
 * 검신 페이지 공통 내비 — 기본은 링크만, 상세는 접힘
 */
'use client';

import Link from 'next/link';

export const GEOM_SHIN_LINKS = [
  { href: '/geomshin', label: '맵', note: '픽셀 칠하기 · 즉시 반영' },
  { href: '/geomshin/presence', label: 'B2B 방문', note: '어디서·몇 시·얼마나' },
  { href: '/geomshin/shop', label: '만원의 행복', note: 'QR 발급 · ₩1만 스텁' },
  { href: '/geomshin/terms', label: '약관', note: '이용 안내' },
  { href: '/geomshin/admin', label: '관리', note: '초기화·차단 스텁' },
] as const;

type Props = {
  current?: string;
  /** true면 링크만 (맵 첫 화면 빠르게) */
  compact?: boolean;
};

export default function GeomShinNav({ current, compact }: Props) {
  return (
    <nav className={`gs-nav${compact ? ' gs-nav-compact' : ''}`} aria-label="검신 메뉴">
      <div className="gs-nav-links">
        {GEOM_SHIN_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`gs-nav-item${current === l.href ? ' active' : ''}`}
            title={l.note}
          >
            <span className="gs-nav-label">{l.label}</span>
            {!compact && <span className="gs-nav-note">{l.note}</span>}
          </Link>
        ))}
      </div>
      {!compact && (
        <details className="gs-nav-details">
          <summary>기획 메모 (접힘)</summary>
          <ul className="gs-nav-stubs">
            <li>
              <b>칠하기</b> — 로컬 즉시 반영 · 서버는 도착 순 덮어쓰기(LWW)
            </li>
            <li>
              <b>GPS</b> — 현장 잉크 버프 + B2B 방문 로그 (플레이 맵과 분리)
            </li>
            <li>
              <b>만원의 행복</b> — 7일 만료 QR · 잉크 충전 · 결제 스텁
            </li>
            <li>
              <b>후속</b> — 아이돌 도트 · 라이더 픽업 QR
            </li>
          </ul>
        </details>
      )}
    </nav>
  );
}
