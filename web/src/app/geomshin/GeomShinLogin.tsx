'use client';

import { FormEvent, useState } from 'react';
import { validatePlayerId, writeStoredSession } from '@/lib/geomshin/session';

type Props = {
  initialId?: string;
  onEnter: (id: string, displayName: string) => void;
};

export default function GeomShinLogin({ initialId = '', onEnter }: Props) {
  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = validatePlayerId(id);
    if (!checked.ok) {
      setErr(checked.reason);
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/geomshin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': checked.id },
        body: JSON.stringify({ userId: checked.id, displayName: checked.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.reason || '입장 실패');
        setBusy(false);
        return;
      }
      const displayName = data.user?.displayName || checked.id;
      writeStoredSession(checked.id, displayName);
      onEnter(checked.id, displayName);
    } catch {
      setErr('서버에 연결할 수 없습니다');
      setBusy(false);
    }
  };

  return (
    <div className="gs-root gs-login-root">
      <div className="gs-login-card">
        <p className="gs-login-kicker">검단신도시 픽셀 전광판</p>
        <h1 className="gs-login-title">검신</h1>
        <p className="gs-login-sub">아이디만 입력하면 바로 시작합니다 · 비밀번호 없음</p>
        <form className="gs-login-form" onSubmit={submit}>
          <label className="gs-login-label" htmlFor="gs-player-id">
            내 아이디
          </label>
          <input
            id="gs-player-id"
            className="gs-login-input"
            autoComplete="username"
            autoFocus
            maxLength={20}
            placeholder="예: geomdan, 시민A"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={busy}
          />
          <button className="gs-login-btn" type="submit" disabled={busy}>
            {busy ? '입장 중…' : '게임 시작'}
          </button>
          {err ? <p className="gs-login-err">{err}</p> : null}
        </form>
        <p className="gs-login-hint">
          같은 아이디로 다시 들어오면 내 영토·잉크가 이어집니다.
          <br />
          아직 서버 메모리는 프로세스 단위라, 배포 멀티는 Supabase 연결이 필요합니다.
        </p>
      </div>
    </div>
  );
}
