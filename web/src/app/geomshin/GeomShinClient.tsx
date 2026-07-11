'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TERMS } from '@/lib/geomshin/terms';
import { PALETTE, colorToCss, parseBrushColor } from '@/lib/geomshin/palette';
import { LANDMARKS } from '@/lib/geomshin/landmarks';
import type { BoardCell, LandmarkInfo } from '@/game/geomshin/GeomShinScene';
import type { PresenceCell } from '@/game/geomshin/PhaserMap';
import GeomShinNav from './GeomShinNav';
import GeomShinLogin from './GeomShinLogin';
import { clearStoredSession, encodeUserIdHeader, readStoredSession } from '@/lib/geomshin/session';

const PhaserMap = dynamic(() => import('@/game/geomshin/PhaserMap'), {
  ssr: false,
  loading: () => <div className="gs-phaser-host gs-map-skel">맵 준비 중…</div>,
});

type UserState = {
  id: string;
  slot: number;
  ink: number;
  seeded: boolean;
  displayName: string;
  brushColor: number;
  homeX: number;
  homeY: number;
  onsite?: boolean;
  geoMode?: 'onsite' | 'remote';
  refillMs?: number;
  geoX?: number;
  geoY?: number;
};

type PresenceSummary = {
  totalHits: number;
  lastHourUniqueCells: number;
  topCells: PresenceCell[];
  visits?: unknown[];
  note: string;
};

const INITIAL_LANDMARKS: LandmarkInfo[] = LANDMARKS.map((lm) => ({
  label: lm.label,
  x: lm.x,
  y: lm.y,
  w: lm.w,
  h: lm.h,
}));

const REASON_KO: Record<string, string> = {
  NO_INK: '잉크가 부족합니다',
  NEED_SEED: '먼저 시작 씨앗을 심으세요',
  ALREADY_SEEDED: '씨앗은 한 번만 심을 수 있습니다',
  NOT_ADJACENT: '내 픽셀과 상하좌우로 맞닿은 칸만 칠할 수 있습니다',
  LANDMARK: '랜드마크(분양 구역)는 칠할 수 없습니다',
  LOCKED: '코팅으로 잠긴 칸입니다',
  OCCUPIED: '이미 다른 시민이 점유한 칸입니다',
  BLOCKED: '이용이 제한된 계정입니다',
  NO_EMPTY: '빈 칸을 찾지 못했습니다',
};

export default function GeomShinClient() {
  const [phase, setPhase] = useState<'boot' | 'login' | 'play'>('boot');
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [landmarks] = useState<LandmarkInfo[]>(INITIAL_LANDMARKS);
  const [cells, setCells] = useState<BoardCell[]>([]);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState('#22c55e');
  const [msg, setMsg] = useState('내 픽셀 찍는 중…');
  const [geoMsg, setGeoMsg] = useState('위치는 부가 · 나중에');
  const [view, setView] = useState({ x0: 60, y0: 60, x1: 120, y1: 120 });
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);
  const [pan] = useState<{ x: number; y: number } | null>(null);
  const [presence, setPresence] = useState<PresenceSummary | null>(null);
  const booted = useRef(false);
  const geoAsked = useRef(false);
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brushRef = useRef(brush);
  brushRef.current = brush;

  useEffect(() => {
    const s = readStoredSession();
    if (s) {
      setUserId(s.id);
      setPhase('play');
    } else {
      setPhase('login');
    }
  }, []);

  const enterAs = (id: string) => {
    booted.current = false;
    geoAsked.current = false;
    setCells([]);
    setUser(null);
    setFocus(null);
    setSelected(null);
    setMsg('내 픽셀 찍는 중…');
    setUserId(id);
    setPhase('play');
  };

  const logout = () => {
    clearStoredSession();
    booted.current = false;
    geoAsked.current = false;
    setUserId(null);
    setUser(null);
    setCells([]);
    setFocus(null);
    setSelected(null);
    setPhase('login');
  };

  const headers = useMemo((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    // 한글 아이디는 헤더에 그대로 못 넣음
    if (userId) h['x-user-id'] = encodeUserIdHeader(userId);
    return h;
  }, [userId]);

  const mergeDelta = (delta: BoardCell) => {
    setCells((prev) => {
      const next = prev.filter((c) => !(c.x === delta.x && c.y === delta.y));
      next.push(delta);
      return [...next];
    });
  };

  const goHome = useCallback((x: number, y: number, note?: string) => {
    setFocus({ x, y });
    setSelected({ x, y });
    setView({ x0: x - 20, y0: y - 20, x1: x + 20, y1: y + 20 });
    if (note) setMsg(note);
  }, []);

  const onViewChange = useCallback((v: { x0: number; y0: number; x1: number; y1: number }) => {
    if (viewTimer.current) clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(() => setView(v), 450);
  }, []);

  const refreshPresence = useCallback(() => {
    fetch('/api/geomshin/presence')
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) setPresence(data.summary);
      })
      .catch(() => {});
  }, []);

  /** 시작 즉시: 캐시된 내 픽셀 표시 + 시드 API 최우선 */
  useEffect(() => {
    if (!userId || booted.current) return;
    booted.current = true;
    let cancelled = false;

    // 1) 로컬 캐시로 카메라·칸 즉시 (서버 기다리지 않음)
    try {
      const cached = localStorage.getItem('geomshin_home');
      if (cached) {
        const h = JSON.parse(cached) as { x: number; y: number; color?: number; slot?: number };
        if (h.x >= 0 && h.y >= 0) {
          mergeDelta({
            x: h.x,
            y: h.y,
            color: h.color ?? 0x22c55e,
            ownerSlot: h.slot ?? 1,
            hasAd: false,
          });
          goHome(h.x, h.y, `내 픽셀 (${h.x}, ${h.y}) · 동기화 중…`);
        }
      }
    } catch {
      /* ignore */
    }

    (async () => {
      try {
        // 2) 시드 최우선 — 잉크보다 먼저 찍기
        const seedRes = await fetch('/api/geomshin/seed', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, auto: true, color: brushRef.current }),
        });
        const seedData = await seedRes.json().catch(() => ({ ok: false }));
        if (cancelled) return;

        let u = seedData.user as UserState | undefined;
        if (u) {
          setUser(u);
          if (u.brushColor != null) setBrush(colorToCss(u.brushColor));
        }

        const dx = seedData.delta?.x ?? u?.homeX;
        const dy = seedData.delta?.y ?? u?.homeY;
        if (seedData.ok && dx != null && dy != null && dx >= 0 && dy >= 0) {
          const color = seedData.delta?.color ?? u?.brushColor ?? 0x22c55e;
          const slot = seedData.delta?.ownerSlot ?? u?.slot ?? 1;
          mergeDelta({
            x: dx,
            y: dy,
            color,
            ownerSlot: slot,
            hasAd: seedData.delta?.hasAd ?? false,
          });
          goHome(dx, dy, `내 픽셀 (${dx}, ${dy}) · 여기서 인접만 칠하기`);
          try {
            localStorage.setItem(
              'geomshin_home',
              JSON.stringify({ x: dx, y: dy, color, slot }),
            );
          } catch {
            /* ignore */
          }
        } else if (!u?.seeded) {
          setMsg(REASON_KO[seedData.reason] || '시작 픽셀을 찍지 못했습니다 · 맵 클릭');
        }

        // 3) 잉크/유저 상태는 뒤에서 보강
        fetch(`/api/geomshin/ink?userId=${encodeURIComponent(userId)}`, { headers })
          .then((r) => r.json())
          .then((inkData) => {
            if (cancelled || !inkData.user) return;
            setUser(inkData.user);
            if (inkData.user.brushColor != null) setBrush(colorToCss(inkData.user.brushColor));
          })
          .catch(() => {});

        refreshPresence();
      } catch {
        if (cancelled) return;
        booted.current = false;
        setMsg('시드 실패 · 새로고침하거나 맵을 클릭하세요');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** GPS는 첫 페인트 이후 지연 — 화면 차단하지 않음 */
  useEffect(() => {
    if (!userId || geoAsked.current) return;
    const start = window.setTimeout(() => {
      if (geoAsked.current) return;
      geoAsked.current = true;
      if (!navigator.geolocation) {
        setGeoMsg('위치 미지원 · 집관 모드');
        return;
      }
      setGeoMsg('위치 권한(선택) · 거부해도 플레이 가능');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch('/api/geomshin/presence', {
              method: 'POST',
              headers,
              body: JSON.stringify({ userId, lat, lng }),
            });
            if (!res.ok) throw new Error(`presence ${res.status}`);
            const data = await res.json();
            if (data.user) setUser(data.user);
            if (data.onsite && data.cell) {
              setGeoMsg(`현장 · 격자 (${data.cell.x},${data.cell.y}) · 잉크 1분/1`);
            } else {
              setGeoMsg('집관 · 잉크 5분/1');
            }
            refreshPresence();
          } catch {
            setGeoMsg('위치 전송 실패 · 집관 (플레이 가능)');
          }
        },
        (err) => {
          setGeoMsg(
            err.code === err.PERMISSION_DENIED
              ? '위치 거부 · 집관 (플레이 가능)'
              : '위치 실패 · 집관 (플레이 가능)',
          );
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
      );
    }, 1200);
    return () => clearTimeout(start);
  }, [headers, userId, refreshPresence]);

  useEffect(() => {
    const t = setInterval(refreshPresence, 30_000);
    return () => clearInterval(t);
  }, [refreshPresence]);

  useEffect(() => {
    const q = new URLSearchParams({
      x0: String(view.x0),
      y0: String(view.y0),
      x1: String(view.x1),
      y1: String(view.y1),
    });
    let cancelled = false;
    fetch(`/api/geomshin/pixels?${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(`pixels ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCells(
          (data.cells || []).map((c: BoardCell) => ({
            x: c.x,
            y: c.y,
            color: c.color,
            ownerSlot: c.ownerSlot,
            hasAd: c.hasAd,
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [view]);

  const pickColor = async (hex: string) => {
    setBrush(hex);
    if (!userId) return;
    try {
      const res = await fetch('/api/geomshin/brush', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, color: hex }),
      });
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch {
      /* 로컬 팔레트는 유지 */
    }
  };

  const onSelect = async (x: number, y: number) => {
    if (!userId) return;
    setSelected({ x, y });

    let u = user;
    if (!u?.seeded) {
      setMsg('시작 씨앗을 심는 중…');
      try {
        const seedRes = await fetch('/api/geomshin/seed', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, auto: true, color: brush }),
        });
        const seedData = await seedRes.json();
        if (seedData.user) {
          u = seedData.user;
          setUser(seedData.user);
        }
        if (seedData.ok && seedData.delta) {
          mergeDelta({
            x: seedData.delta.x,
            y: seedData.delta.y,
            color: seedData.delta.color,
            ownerSlot: seedData.delta.ownerSlot,
            hasAd: seedData.delta.hasAd,
          });
          goHome(
            seedData.delta.x,
            seedData.delta.y,
            `시작 (${seedData.delta.x}, ${seedData.delta.y})`,
          );
          try {
            localStorage.setItem(
              'geomshin_home',
              JSON.stringify({
                x: seedData.delta.x,
                y: seedData.delta.y,
                color: seedData.delta.color,
                slot: seedData.delta.ownerSlot,
              }),
            );
          } catch {
            /* ignore */
          }
        }
        if (!u?.seeded) {
          setMsg(REASON_KO[seedData.reason] || '시작 위치가 없어 칠할 수 없습니다');
          return;
        }
      } catch {
        setMsg('시드 실패 · 잠시 후 다시');
        return;
      }
    }

    const slot = u!.slot;
    const colorNum = parseBrushColor(brush, u!.brushColor);
    const prev = cells.find((c) => c.x === x && c.y === y) || null;
    const optimisticInk = Math.max(0, (u!.ink ?? 0) - (prev?.ownerSlot === slot ? 0 : 1));

    mergeDelta({ x, y, color: colorNum, ownerSlot: slot, hasAd: prev?.hasAd });
    setUser({ ...u!, ink: optimisticInk });
    setMsg(`(${x},${y})`);

    try {
      const res = await fetch('/api/geomshin/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, x, y, color: brush }),
      });
      const data = await res.json();
      if (data.user) setUser(data.user);
      if (data.ok && data.delta) {
        mergeDelta({
          x: data.delta.x,
          y: data.delta.y,
          color: data.delta.color,
          ownerSlot: data.delta.ownerSlot,
          hasAd: data.delta.hasAd,
        });
        setMsg(
          `(${x},${y}) ${data.kind === 'RECOLOR' ? '색 변경' : '칠하기'} · ${TERMS.inkShort} ${data.user.ink}`,
        );
      } else {
        if (prev) mergeDelta(prev);
        else mergeDelta({ x, y, color: 0, ownerSlot: 0, hasAd: false });
        if (data.user) setUser(data.user);
        else if (u) setUser(u);
        setMsg(REASON_KO[data.reason] || data.reason || '할 수 없습니다');
      }
    } catch {
      if (prev) mergeDelta(prev);
      else mergeDelta({ x, y, color: 0, ownerSlot: 0, hasAd: false });
      if (u) setUser(u);
      setMsg('네트워크 오류 · 칠하기 취소');
    }
  };

  const reward = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/geomshin/reward', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, amount: 5 }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setMsg(`리워드(스텁) · ${TERMS.inkShort} +5 → ${data.user.ink}`);
      }
    } catch {
      setMsg('리워드 실패');
    }
  };

  if (phase === 'boot') {
    return (
      <div className="gs-root">
        <div className="gs-phaser-host gs-map-skel">검신 여는 중…</div>
      </div>
    );
  }

  if (phase === 'login' || !userId) {
    return <GeomShinLogin onEnter={(id) => enterAs(id)} />;
  }

  return (
    <div className="gs-root">
      <header className="gs-hud gs-hud-slim">
        <div className="gs-brand">
          <strong>{TERMS.brand}</strong>
          <span>즉시 칠하기 · 인접만 확장</span>
          <span className="gs-player-id" title="내 아이디">
            @{user?.displayName || userId}
          </span>
        </div>
        <GeomShinNav current="/geomshin" compact />
        <div className="gs-stats">
          <span>
            {TERMS.inkShort} <b>{user?.ink ?? '…'}</b> / 200
          </span>
          <span className={user?.onsite ? 'gs-mode-onsite' : 'gs-mode-remote'}>
            {user?.onsite ? '현장 · 1분/1' : '집관 · 5분/1'}
          </span>
          <span>
            {user?.seeded && user.homeX >= 0
              ? `시작 (${user.homeX},${user.homeY})`
              : '동기화 중'}
          </span>
          {selected && (
            <span>
              선택 ({selected.x},{selected.y})
            </span>
          )}
          <a className="gs-heat-stat" href="/geomshin/presence">
            B2B {presence?.totalHits ?? 0}→
          </a>
        </div>

        <div className="gs-palette" role="listbox" aria-label="색 선택">
          {PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`gs-swatch${brush.toLowerCase() === hex.toLowerCase() ? ' active' : ''}`}
              style={{ background: hex }}
              title={hex}
              onClick={() => pickColor(hex)}
            />
          ))}
          <label className="gs-color-input">
            <span>직접</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(brush) ? brush : colorToCss(parseBrushColor(brush))}
              onChange={(e) => pickColor(e.target.value)}
            />
          </label>
          <span className="gs-brush-preview" style={{ background: brush }} title={brush} />
        </div>

        <div className="gs-actions">
          <button
            type="button"
            onClick={() => {
              if (user && user.homeX >= 0) {
                goHome(user.homeX, user.homeY, `내 픽셀 (${user.homeX}, ${user.homeY})`);
              } else {
                setMsg('시드 동기화 전이면 맵을 클릭하세요');
              }
            }}
          >
            내 픽셀
          </button>
          <a className="gs-link" href="/geomshin/presence">
            B2B
          </a>
          <a className="gs-link" href="/geomshin/shop">
            QR
          </a>
          <button type="button" onClick={reward}>
            리워드
          </button>
          <button type="button" className="gs-logout" onClick={logout}>
            아이디 변경
          </button>
        </div>
        <p className="gs-msg gs-msg-one">{msg} · {geoMsg}</p>
      </header>
      <div className="gs-map">
        <PhaserMap
          landmarks={landmarks}
          onSelect={onSelect}
          onViewChange={onViewChange}
          cells={cells}
          mySlot={user?.slot ?? 0}
          focus={focus}
          pan={pan}
          presence={[]}
          showHeat={false}
        />
      </div>
    </div>
  );
}
