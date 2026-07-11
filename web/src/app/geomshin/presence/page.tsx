'use client';

import { useEffect, useMemo, useState } from 'react';
import '../geomshin.css';
import GeomShinNav from '../GeomShinNav';

type Visit = {
  x: number;
  y: number;
  lat: number;
  lng: number;
  atMs: number;
  onsite: boolean;
  anon: string;
};

type Summary = {
  totalHits: number;
  lastHourUniqueCells: number;
  topCells: { x: number; y: number; hits: number }[];
  visits: Visit[];
  note: string;
};

const GRID = 500;
const VIEW = 360;

/** B2B 전용 — 방문 시점 위치·시간·밀집 (플레이 맵과 분리) */
export default function PresenceMapPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState('');

  const load = () => {
    fetch('/api/geomshin/presence')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErr(data.reason || '조회 실패');
          return;
        }
        setSummary(data.summary);
        setErr('');
      })
      .catch(() => setErr('네트워크 오류'));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  const maxHits = useMemo(() => {
    if (!summary?.topCells?.length) return 1;
    return Math.max(1, ...summary.topCells.map((c) => c.hits));
  }, [summary]);

  return (
    <div className="gs-root gs-shop">
      <header className="gs-hud">
        <div className="gs-brand">
          <strong>B2B 방문 지도</strong>
          <span>어디서 · 얼마나 · 몇 시에 접속했는지</span>
        </div>
        <GeomShinNav current="/geomshin/presence" />
        <p className="gs-msg">
          플레이 픽셀 맵과 분리된 사장님/광고 지표용 화면입니다. GPS 동의 시점의 격자·시각을
          찍습니다. (푸트폴 히트맵 스텁)
        </p>
        <div className="gs-stats">
          <span>
            총 방문 <b>{summary?.totalHits ?? 0}</b>
          </span>
          <span>
            최근 1시간 격자 <b>{summary?.lastHourUniqueCells ?? 0}</b>
          </span>
          <button type="button" className="gs-link" onClick={load}>
            새로고침
          </button>
        </div>
        {err && <p className="gs-msg">{err}</p>}
      </header>

      <div className="gs-presence-body">
        <div className="gs-presence-map" style={{ width: VIEW, height: VIEW }}>
          <svg width={VIEW} height={VIEW} viewBox={`0 0 ${GRID} ${GRID}`}>
            <rect width={GRID} height={GRID} fill="#1e293b" />
            {(summary?.topCells || []).map((c) => {
              const t = c.hits / maxHits;
              const op = 0.25 + t * 0.7;
              return (
                <rect
                  key={`${c.x},${c.y}`}
                  x={c.x}
                  y={c.y}
                  width={3}
                  height={3}
                  fill={`rgba(249,115,22,${op})`}
                >
                  <title>
                    ({c.x},{c.y}) · {c.hits}회
                  </title>
                </rect>
              );
            })}
            {(summary?.visits || []).slice(0, 40).map((v, i) => (
              <circle
                key={`${v.atMs}-${i}`}
                cx={v.x + 0.5}
                cy={v.y + 0.5}
                r={2.2}
                fill="#38bdf8"
                opacity={0.9}
              >
                <title>
                  {new Date(v.atMs).toLocaleString('ko-KR')} · ({v.x},{v.y})
                </title>
              </circle>
            ))}
          </svg>
          <p className="gs-msg">주황=밀집 격자 · 파란 점=최근 방문 시점</p>
        </div>

        <div className="gs-presence-list">
          <h2>최근 방문 (24h)</h2>
          <ul>
            {(summary?.visits || []).length === 0 && <li>아직 방문 로그 없음 · 맵에서 위치 동의 시 기록</li>}
            {(summary?.visits || []).map((v, i) => (
              <li key={`${v.atMs}-${i}`}>
                <time dateTime={new Date(v.atMs).toISOString()}>
                  {new Date(v.atMs).toLocaleString('ko-KR')}
                </time>
                <span>
                  격자 ({v.x},{v.y})
                </span>
                <span className="gs-presence-meta">
                  {v.onsite ? '현장' : '원격'} · {v.anon}
                </span>
              </li>
            ))}
          </ul>
          <p className="gs-msg">{summary?.note}</p>
        </div>
      </div>
    </div>
  );
}
