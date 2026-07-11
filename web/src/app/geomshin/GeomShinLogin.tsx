'use client';

import { FormEvent, useState } from 'react';
import { validateDisplayName, writeStoredSession } from '@/lib/geomshin/session';
import { getBrowserSupabase, isSupabaseBrowserReady } from '@/lib/geomshin/supabaseBrowser';

type Props = {
  onEnter: (id: string, displayName: string, accessToken: string) => void;
};

type Mode = 'login' | 'signup';

export default function GeomShinLogin({ onEnter }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    if (!isSupabaseBrowserReady()) {
      setErr('Supabase 설정이 없습니다');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setErr('이메일과 비밀번호(6자 이상)를 입력하세요');
      return;
    }
    let displayName = nick.trim();
    if (mode === 'signup') {
      const n = validateDisplayName(displayName || email.split('@')[0] || '시민');
      if (!n.ok) {
        setErr(n.reason);
        return;
      }
      displayName = n.id;
    }

    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) {
          setErr(error.message);
          setBusy(false);
          return;
        }
        if (!data.session) {
          setInfo('가입 메일을 확인한 뒤 로그인해 주세요. (Supabase Auth → Confirm email 끄면 바로 입장)');
          setMode('login');
          setBusy(false);
          return;
        }
        await finish(data.session.access_token, data.user!.id, displayName);
        return;
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      if (!data.session || !data.user) {
        setErr('로그인 세션을 받지 못했습니다');
        setBusy(false);
        return;
      }
      const meta = data.user.user_metadata || {};
      const name =
        (typeof meta.display_name === 'string' && meta.display_name) ||
        displayName ||
        data.user.email?.split('@')[0] ||
        '시민';
      await finish(data.session.access_token, data.user.id, name);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '인증 실패');
      setBusy(false);
    }
  };

  const finish = async (accessToken: string, userId: string, displayName: string) => {
    const res = await fetch('/api/geomshin/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json().catch(() => ({ ok: false, reason: `HTTP ${res.status}` }));
    if (!data.ok) {
      setErr(data.detail || data.reason || '세션 동기화 실패');
      setBusy(false);
      return;
    }
    const name = data.user?.displayName || displayName;
    writeStoredSession(userId, name);
    onEnter(userId, name, accessToken);
  };

  return (
    <div className="gs-root gs-login-root">
      <div className="gs-login-card">
        <p className="gs-login-kicker">검단신도시 픽셀 전광판</p>
        <h1 className="gs-login-title">검신</h1>
        <p className="gs-login-sub">Supabase 계정으로 입장 · 남의 영토를 아이디만으로 훔칠 수 없습니다</p>

        <div className="gs-login-tabs" role="tablist">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            disabled={busy}
          >
            로그인
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
            disabled={busy}
          >
            회원가입
          </button>
        </div>

        <form className="gs-login-form" onSubmit={submit}>
          <label className="gs-login-label" htmlFor="gs-email">
            이메일
          </label>
          <input
            id="gs-email"
            className="gs-login-input"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="you@example.com"
          />
          <label className="gs-login-label" htmlFor="gs-password">
            비밀번호
          </label>
          <input
            id="gs-password"
            className="gs-login-input"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            placeholder="6자 이상"
          />
          {mode === 'signup' ? (
            <>
              <label className="gs-login-label" htmlFor="gs-nick">
                닉네임 (화면에 표시)
              </label>
              <input
                id="gs-nick"
                className="gs-login-input"
                autoComplete="nickname"
                maxLength={20}
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                disabled={busy}
                placeholder="예: 시민A"
              />
            </>
          ) : null}
          <button className="gs-login-btn" type="submit" disabled={busy}>
            {busy ? '처리 중…' : mode === 'signup' ? '가입하고 시작' : '로그인하고 시작'}
          </button>
          {err ? <p className="gs-login-err">{err}</p> : null}
          {info ? <p className="gs-login-info">{info}</p> : null}
        </form>
        <p className="gs-login-hint">
          소유권은 이메일 계정(Auth)에 묶입니다. 닉네임만 알아도 영토를 빼앗을 수 없습니다.
        </p>
      </div>
    </div>
  );
}
