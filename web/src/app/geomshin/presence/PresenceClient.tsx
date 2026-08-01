'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import GeomShinNav from '../GeomShinNav';

// 지도 컴포넌트 동적 로드
const MapContainer = dynamicImport(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamicImport(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
import { useMap } from 'react-leaflet';

type Visit = { x: number; y: number; lat: number; lng: number; atMs: number; onsite: boolean; anon: string; };
type Summary = { totalHits: number; lastHourUniqueCells: number; topCells: { x: number; y: number; hits: number }[]; visits: Visit[]; note: string; };

// 히트맵 레이어 컴포넌트
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const heat = (L as any).heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
}

export default function PresenceClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState('');

  const load = () => {
    fetch('/api/geomshin/presence')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) { setErr(data.reason || '조회 실패'); return; }
        setSummary(data.summary);
      })
      .catch(() => setErr('네트워크 오류'));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const heatmapPoints = useMemo(() => {
    return (summary?.visits || []).map(v => [v.lat, v.lng, 1] as [number, number, number]);
  }, [summary]);

  return (
    <div className="gs-root gs-shop">
      <header className="gs-hud">
        <div className="gs-brand">
          <strong>접속 위치 분석 지도</strong>
        </div>
        <p>사장님용 접속 위치 히트맵입니다.</p>
        <div className="gs-stats">
          <span>총 방문 <b>{summary?.totalHits ?? 0}</b></span>
          <button type="button" className="gs-link" onClick={load}>새로고침</button>
        </div>
      </header>
      
      <div style={{ height: '600px', width: '100%' }}>
        <MapContainer center={[37.5665, 126.9780] as any} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <HeatmapLayer points={heatmapPoints} />
        </MapContainer>
      </div>
    </div>
  );
}
