'use client';

import { useState } from 'react';
import '../geomshin.css';
import GeomShinNav from '../GeomShinNav';

export default function AdminPage() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [userId, setUserId] = useState('');
  const [log, setLog] = useState('');
  const [presenceLog, setPresenceLog] = useState('');

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/geomshin/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLog(JSON.stringify(data));
  };

  const loadPresence = async () => {
    const res = await fetch('/api/geomshin/presence');
    const data = await res.json();
    setPresenceLog(JSON.stringify(data.summary, null, 2));
  };

  return (
    <main className="gs-panel">
      <h1>검신 관리 (스텁)</h1>
      <GeomShinNav current="/geomshin/admin" />
      <p>신고 좌표 강제 초기화 · 유저 차단 · B2B 체류 조회</p>
      <div className="gs-actions">
        <label>
          x{' '}
          <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
        </label>
        <label>
          y{' '}
          <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
        </label>
        <button type="button" onClick={() => post({ action: 'clear', x, y })}>
          좌표 초기화
        </button>
      </div>
      <div className="gs-actions" style={{ marginTop: 16 }}>
        <input
          placeholder="userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button type="button" onClick={() => post({ action: 'block', userId, blocked: true })}>
          차단
        </button>
        <button type="button" onClick={() => post({ action: 'block', userId, blocked: false })}>
          차단 해제
        </button>
      </div>
      <div className="gs-actions" style={{ marginTop: 16 }}>
        <button type="button" onClick={loadPresence}>
          B2B 밀집도 요약 불러오기
        </button>
      </div>
      <pre>{log}</pre>
      {presenceLog && <pre>{presenceLog}</pre>}
    </main>
  );
}
