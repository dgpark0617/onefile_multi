'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ComicPanel from './ComicPanel';
import ComicAvatar from './ComicAvatar';
import CharacterEditor from './CharacterEditor';
import { inferEmotion } from '@/lib/comicchat/emotions';
import { inferBubble, stagePanel } from '@/lib/comicchat/staging';
import { layoutPanels } from '@/lib/comicchat/layoutPanels';
import { loadSavedLook, saveLook } from '@/lib/comicchat/lookStorage';
import {
  createHostRoom,
  joinGuestRoom,
  type ComicRoom,
} from '@/lib/comicchat/peerRoom';
import {
  BUBBLE_LABEL,
  BUBBLE_TYPES,
  CHARACTERS,
  DEFAULT_LOOK,
  EMOTION_LABEL,
  WHEEL_CLOCK,
  lookFromPreset,
  type BubbleType,
  type CharacterId,
  type CharLook,
  type ComicMsg,
  type Emotion,
  type PresetCharacterId,
  type RoomMember,
} from '@/lib/comicchat/types';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function useKeyboardChrome(
  active: boolean,
  dockRef: React.RefObject<HTMLElement | null>,
  onChange?: () => void,
) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;

    const sync = () => {
      const layoutH = window.innerHeight;
      const height = vv?.height ?? layoutH;
      const offsetTop = vv?.offsetTop ?? 0;
      // iOS: 키보드는 레이아웃을 안 줄이고 오버레이 → 아래 가려진 높이
      const kb = Math.max(0, Math.round(layoutH - height - offsetTop));
      const dockH = Math.round(dockRef.current?.offsetHeight ?? 72);

      root.style.setProperty('--cc-vv-height', `${Math.round(height)}px`);
      root.style.setProperty('--cc-vv-top', `${Math.round(offsetTop)}px`);
      root.style.setProperty('--cc-kb', `${kb}px`);
      root.style.setProperty('--cc-dock-space', `${dockH}px`);
      root.style.setProperty('--cc-stage-height', `${Math.max(120, Math.round(height - dockH))}px`);

      if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
      onChange?.();
    };

    body.classList.add('cc-lock-scroll');
    sync();

    const ro =
      typeof ResizeObserver !== 'undefined' && dockRef.current
        ? new ResizeObserver(() => sync())
        : null;
    if (dockRef.current && ro) ro.observe(dockRef.current);

    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    // iOS 키보드 애니메이션 중 지연 재측정
    const onFocusIn = () => {
      window.setTimeout(sync, 50);
      window.setTimeout(sync, 300);
      window.setTimeout(sync, 600);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusIn);

    return () => {
      body.classList.remove('cc-lock-scroll');
      ro?.disconnect();
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusIn);
      root.style.removeProperty('--cc-vv-height');
      root.style.removeProperty('--cc-vv-top');
      root.style.removeProperty('--cc-kb');
      root.style.removeProperty('--cc-dock-space');
      root.style.removeProperty('--cc-stage-height');
    };
  }, [active, dockRef, onChange]);
}

function useIsDesktop(minWidth = 900) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [minWidth]);
  return desktop;
}

export default function ComicChatApp() {
  const search = useSearchParams();
  const joinParam = search.get('join') || '';

  const [nick, setNick] = useState('');
  const [characterId, setCharacterId] = useState<CharacterId>('ink');
  const [customLook, setCustomLook] = useState<CharLook>(DEFAULT_LOOK);
  const [showEditor, setShowEditor] = useState(false);
  const [phase, setPhase] = useState<'lobby' | 'room'>('lobby');
  const [roomCode, setRoomCode] = useState(joinParam);
  const [status, setStatus] = useState('닉네임과 캐릭터를 고른 뒤 방을 만드세요');
  const [toast, setToast] = useState('');
  const [messages, setMessages] = useState<ComicMsg[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('happy');
  const [emotionAuto, setEmotionAuto] = useState(true);
  const [bubble, setBubble] = useState<BubbleType | 'auto'>('auto');
  const [showMood, setShowMood] = useState(false);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [myPeerId, setMyPeerId] = useState('');
  const [roomSheet, setRoomSheet] = useState(false);
  const roomRef = useRef<ComicRoom | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop(900);

  const scrollToLatest = useCallback((smooth = false) => {
    const el = stripRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (smooth) el.scrollTo({ top, behavior: 'smooth' });
    else el.scrollTop = top;
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setStatus(msg);
  }, []);

  useKeyboardChrome(
    phase === 'room',
    dockRef,
    useCallback(() => {
      requestAnimationFrame(() => scrollToLatest(false));
    }, [scrollToLatest]),
  );

  useEffect(() => {
    const saved = loadSavedLook();
    if (saved) {
      setCustomLook(saved);
      setCharacterId('custom');
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const activeLook: CharLook = useMemo(() => {
    if (characterId === 'custom') return customLook;
    return lookFromPreset(characterId);
  }, [characterId, customLook]);

  const panels = useMemo(() => layoutPanels(messages), [messages]);

  const previewEmotion = emotionAuto
    ? text.trim()
      ? inferEmotion(text)
      : emotion
    : emotion;

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !roomCode || phase !== 'room') return '';
    const u = new URL(window.location.href);
    u.searchParams.set('join', roomCode);
    return u.toString();
  }, [roomCode, phase]);

  const qrSrc = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(inviteUrl)}`
    : '';

  useEffect(() => {
    scrollToLatest(false);
  }, [panels.length, messages.length, scrollToLatest]);

  useEffect(() => {
    return () => {
      roomRef.current?.destroy();
      roomRef.current = null;
    };
  }, []);

  const selfMember = (): RoomMember => ({
    peerId: myPeerId || 'me',
    nick: nick.trim() || '나',
    look: activeLook,
    characterId,
  });

  const startHost = async () => {
    if (!nick.trim()) {
      setStatus('닉네임을 입력하세요');
      return;
    }
    setBusy(true);
    setStatus('방 여는 중…');
    try {
      roomRef.current?.destroy();
      const room = await createHostRoom(
        { peerId: 'host', nick: nick.trim(), look: activeLook, characterId },
        {
          onStatus: setStatus,
          onMessages: setMessages,
          onMembers: setMembers,
          onPeerId: (code) => {
            setRoomCode(code);
            setMyPeerId(code);
          },
        },
      );
      roomRef.current = room;
      setPhase('room');
      flash(`방 ${room.peerId}`);
    } catch {
      setStatus('방을 열지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const startJoin = async (code = roomCode) => {
    if (!nick.trim()) {
      setStatus('닉네임을 입력하세요');
      return;
    }
    const clean = code.trim().toLowerCase();
    if (!clean) {
      setStatus('방 코드를 입력하세요');
      return;
    }
    setBusy(true);
    setStatus('연결 중…');
    try {
      roomRef.current?.destroy();
      const room = await joinGuestRoom(
        clean,
        { peerId: '', nick: nick.trim(), look: activeLook, characterId },
        {
          onStatus: setStatus,
          onMessages: setMessages,
          onMembers: setMembers,
          onPeerId: setMyPeerId,
        },
      );
      roomRef.current = room;
      setRoomCode(clean);
      setPhase('room');
    } catch {
      setStatus('입장 실패 — 코드/방장을 확인하세요.');
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body || !roomRef.current) return;
    const emo = emotionAuto ? inferEmotion(body) : emotion;
    const bub = bubble === 'auto' ? inferBubble(body, emo) : bubble;
    const peerId = myPeerId || 'me';
    const prev = messages[messages.length - 1];
    const staged = stagePanel({
      text: body,
      emotion: emo,
      bubble: bub,
      peerId,
      prevPeerId: prev?.peerId,
      panelIndex: messages.length,
      prevBg: prev?.bg,
    });
    roomRef.current.sendMessage({
      id: uid(),
      peerId,
      nick: nick.trim(),
      characterId,
      look: activeLook,
      text: body.slice(0, 120),
      emotion: emo,
      pose: staged.pose,
      bubble: bub,
      bg: staged.bg,
      shot: staged.shot,
      at: Date.now(),
    });
    setText('');
    // 키보드 유지 — blur 하지 않음
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      scrollToLatest(true);
    });
  };

  const leave = () => {
    roomRef.current?.destroy();
    roomRef.current = null;
    setMessages([]);
    setMembers([]);
    setRoomSheet(false);
    setComposing(false);
    setShowMood(false);
    setPhase('lobby');
    setStatus('로비로 돌아왔습니다');
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      flash('링크 복사됨');
    } catch {
      flash(inviteUrl);
    }
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      flash(`코드 ${roomCode}`);
    } catch {
      flash(roomCode);
    }
  };

  const onCustomChange = (look: CharLook) => {
    setCustomLook(look);
    setCharacterId('custom');
    saveLook(look);
  };

  const roomInfoBody = (
    <>
      <div className="cc-side-block">
        <h3>참가자</h3>
        <ul className="cc-member-list">
          {(members.length ? members : [selfMember()]).map((m) => (
            <li key={m.peerId}>
              <ComicAvatar
                look={m.look}
                emotion="neutral"
                nick={m.nick}
                size={36}
                fullBody={false}
              />
              <span>{m.nick}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="cc-side-block cc-side-preview">
        <h3>내 캐릭터</h3>
        <ComicAvatar
          look={activeLook}
          emotion={previewEmotion}
          pose="idle"
          nick={nick}
          size={120}
          fullBody
        />
        <p className="cc-preview-name">{nick || activeLook.name}</p>
      </div>
      <div className="cc-side-block cc-side-code">
        <h3>입장 코드</h3>
        <p className="cc-code-big">{roomCode}</p>
        <button type="button" className="cc-btn" onClick={copyRoomCode}>
          코드 복사
        </button>
        <button type="button" className="cc-btn cc-btn-ghost" onClick={copyInvite}>
          링크 복사
        </button>
      </div>
      {qrSrc && (
        <details className="cc-invite">
          <summary>QR (선택)</summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="방 초대 QR" width={140} height={140} />
        </details>
      )}
    </>
  );

  if (phase === 'lobby') {
    return (
      <div className="cc-root cc-lobby-root">
        <header className="cc-hud cc-hud-slim">
          <div className="cc-brand">
            <strong>컷톡</strong>
            <Link href="/" className="cc-home-link">
              ← 홈
            </Link>
          </div>
          <p className="cc-status">{status}</p>
        </header>
        <main className="cc-lobby">
          <label className="cc-field">
            닉네임
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value.slice(0, 12))}
              placeholder="표시 이름"
              maxLength={12}
              autoComplete="nickname"
            />
          </label>
          <fieldset className="cc-chars">
            <legend>캐릭터</legend>
            <div className="cc-char-row">
              {CHARACTERS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cc-char-pick${characterId === c.id ? ' active' : ''}`}
                  onClick={() => setCharacterId(c.id as PresetCharacterId)}
                >
                  <ComicAvatar
                    look={lookFromPreset(c.id)}
                    emotion="happy"
                    pose="wave"
                    nick={c.name}
                    size={56}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
              <button
                type="button"
                className={`cc-char-pick${characterId === 'custom' ? ' active' : ''}`}
                onClick={() => {
                  setCharacterId('custom');
                  setShowEditor(true);
                }}
              >
                <ComicAvatar
                  look={customLook}
                  emotion="love"
                  pose="heart"
                  nick={customLook.name}
                  size={56}
                />
                <span>커스텀</span>
              </button>
            </div>
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-edit-toggle"
              onClick={() => setShowEditor((v) => !v)}
            >
              {showEditor ? '에디터 닫기' : '캐릭터 에디터'}
            </button>
            {showEditor && (
              <CharacterEditor look={customLook} onChange={onCustomChange} />
            )}
          </fieldset>
          <div className="cc-lobby-actions">
            <button type="button" className="cc-btn" disabled={busy} onClick={startHost}>
              방 만들기
            </button>
            <div className="cc-join-box">
              <p className="cc-join-title">방 코드로 입장</p>
              <div className="cc-join-row">
                <input
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.replace(/\s+/g, '').toLowerCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      startJoin();
                    }
                  }}
                  placeholder="예: a3k9mp"
                  maxLength={12}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                />
                <button
                  type="button"
                  className="cc-btn"
                  disabled={busy || !roomCode.trim()}
                  onClick={() => startJoin()}
                >
                  입장
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`cc-root cc-room-layout${!isDesktop ? ' cc-mobile-main' : ''}${composing ? ' cc-composing' : ''}`}
    >
      <header className={`cc-topbar${composing && !isDesktop ? ' cc-topbar-hidden' : ''}`}>
        <button type="button" className="cc-top-code" onClick={copyRoomCode} title="코드 복사">
          {roomCode}
        </button>
        <div className="cc-top-actions">
          <button
            type="button"
            className="cc-icon-btn"
            onClick={() => {
              setComposing(false);
              setShowMood(false);
              inputRef.current?.blur();
              setRoomSheet(true);
            }}
            aria-label="방 정보"
          >
            ⋯
          </button>
          <button type="button" className="cc-icon-btn" onClick={leave} aria-label="나가기">
            ✕
          </button>
        </div>
      </header>

      {toast ? <div className="cc-toast">{toast}</div> : null}

      <div className="cc-main">
        <section className="cc-comic-col">
          <div className="cc-strip" ref={stripRef}>
            <div className="cc-strip-spacer" aria-hidden />
            {panels.length === 0 ? (
              <p className="cc-empty">한마디 던져 보세요</p>
            ) : (
              <div className="cc-panel-grid">
                {panels.map((p) => (
                  <ComicPanel key={p.id} panel={p} />
                ))}
              </div>
            )}
          </div>

          <footer className="cc-dock" ref={dockRef}>
            {!composing || isDesktop ? (
              <div className="cc-dock-tools">
                <div className="cc-bubble-toggles" role="group" aria-label="말풍선">
                  {BUBBLE_TYPES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`cc-bubble-tog${bubble === b ? ' active' : ''}`}
                      onClick={() => setBubble(b)}
                    >
                      {BUBBLE_LABEL[b]}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`cc-bubble-tog${bubble === 'auto' ? ' active' : ''}`}
                    onClick={() => setBubble('auto')}
                  >
                    자동
                  </button>
                  <button
                    type="button"
                    className={`cc-bubble-tog${showMood ? ' active' : ''}`}
                    onClick={() => setShowMood((v) => !v)}
                  >
                    기분
                  </button>
                </div>
              </div>
            ) : (
              <div className="cc-dock-tools cc-dock-tools-mini">
                <span className="cc-dock-hint">
                  {bubble === 'auto' ? '자동' : BUBBLE_LABEL[bubble as BubbleType]}
                  {!emotionAuto ? ` · ${EMOTION_LABEL[emotion]}` : ''}
                </span>
              </div>
            )}
            {showMood && !composing && (
              <div className="cc-emo-chips" role="group" aria-label="기분">
                <button
                  type="button"
                  className={`cc-emo-chip${emotionAuto ? ' active' : ''}`}
                  onClick={() => setEmotionAuto(true)}
                >
                  자동
                </button>
                {WHEEL_CLOCK.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`cc-emo-chip${!emotionAuto && emotion === e ? ' active' : ''}`}
                    onClick={() => {
                      setEmotionAuto(false);
                      setEmotion(e);
                    }}
                  >
                    {EMOTION_LABEL[e]}
                  </button>
                ))}
              </div>
            )}
            <div className="cc-input-row">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => {
                  setRoomSheet(false);
                  setShowMood(false);
                  setComposing(true);
                  requestAnimationFrame(() => {
                    window.scrollTo(0, 0);
                    scrollToLatest(false);
                  });
                }}
                onBlur={() => {
                  // iOS에서 전송 버튼 탭 시 blur 먼저 옴 → 짧게 지연
                  window.setTimeout(() => {
                    if (document.activeElement !== inputRef.current) {
                      setComposing(false);
                    }
                  }, 180);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="대사…"
                maxLength={120}
                enterKeyHint="send"
                autoComplete="off"
              />
              <button type="button" className="cc-btn cc-send" onClick={send}>
                전송
              </button>
            </div>
          </footer>
        </section>

        {isDesktop ? (
          <aside className="cc-sidebar cc-sidebar-desktop">{roomInfoBody}</aside>
        ) : null}
      </div>

      {!isDesktop && roomSheet && (
        <div className="cc-sheet" role="dialog" aria-label="방 정보">
          <div
            className="cc-sheet-backdrop"
            onClick={() => setRoomSheet(false)}
          />
          <div className="cc-sheet-panel">
            <div className="cc-sheet-head">
              <strong>방 정보</strong>
              <button
                type="button"
                className="cc-icon-btn"
                onClick={() => setRoomSheet(false)}
              >
                ✕
              </button>
            </div>
            <div className="cc-sheet-body">{roomInfoBody}</div>
          </div>
        </div>
      )}
    </div>
  );
}
