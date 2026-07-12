'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ComicPanel from './ComicPanel';
import EmotionWheel from './EmotionWheel';
import PoseWheel from './PoseWheel';
import ComicAvatar from './ComicAvatar';
import CharacterEditor from './CharacterEditor';
import { inferEmotion } from '@/lib/comicchat/emotions';
import { stagePanel } from '@/lib/comicchat/staging';
import { loadSavedLook, saveLook } from '@/lib/comicchat/lookStorage';
import {
  createHostRoom,
  joinGuestRoom,
  type ComicRoom,
} from '@/lib/comicchat/peerRoom';
import {
  CHARACTERS,
  DEFAULT_LOOK,
  MAX_PANELS,
  lookFromPreset,
  type CharacterId,
  type CharLook,
  type ComicMsg,
  type Emotion,
  type Pose,
  type PresetCharacterId,
} from '@/lib/comicchat/types';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [messages, setMessages] = useState<ComicMsg[]>([]);
  const [text, setText] = useState('');
  const [emotionMode, setEmotionMode] = useState<Emotion | 'auto'>('auto');
  const [poseMode, setPoseMode] = useState<Pose | 'auto'>('auto');
  const [busy, setBusy] = useState(false);
  const [myPeerId, setMyPeerId] = useState('');
  const roomRef = useRef<ComicRoom | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadSavedLook();
    if (saved) {
      setCustomLook(saved);
      setCharacterId('custom');
    }
  }, []);

  const activeLook: CharLook = useMemo(() => {
    if (characterId === 'custom') return customLook;
    return lookFromPreset(characterId);
  }, [characterId, customLook]);

  const visible = useMemo(() => messages.slice(-MAX_PANELS), [messages]);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !roomCode || phase !== 'room') return '';
    const u = new URL(window.location.href);
    u.searchParams.set('join', roomCode);
    return u.toString();
  }, [roomCode, phase]);

  const qrSrc = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteUrl)}`
    : '';

  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  useEffect(() => {
    return () => {
      roomRef.current?.destroy();
      roomRef.current = null;
    };
  }, []);

  const startHost = async () => {
    if (!nick.trim()) {
      setStatus('닉네임을 입력하세요');
      return;
    }
    setBusy(true);
    setStatus('방 여는 중…');
    try {
      roomRef.current?.destroy();
      const room = await createHostRoom({
        onStatus: setStatus,
        onMessages: setMessages,
        onPeerId: (code) => {
          setRoomCode(code);
          setMyPeerId(code);
        },
      });
      roomRef.current = room;
      setPhase('room');
    } catch {
      setStatus('방을 열지 못했습니다. 네트워크/방화벽을 확인하세요.');
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
        {
          nick: nick.trim(),
          characterId,
          look: activeLook,
        },
        {
          onStatus: setStatus,
          onMessages: setMessages,
          onPeerId: setMyPeerId,
        },
      );
      roomRef.current = room;
      setRoomCode(clean);
      setPhase('room');
    } catch {
      setStatus('입장 실패 — 코드/방장 연결을 확인하세요.');
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body || !roomRef.current) return;
    const emotion =
      emotionMode === 'auto' ? inferEmotion(body) : emotionMode;
    const peerId = myPeerId || 'me';
    const prev = messages[messages.length - 1];
    const staged = stagePanel(
      {
        text: body,
        emotion,
        peerId,
        prevPeerId: prev?.peerId,
        panelIndex: messages.length,
      },
      poseMode,
    );
    const msg: ComicMsg = {
      id: uid(),
      peerId,
      nick: nick.trim(),
      characterId,
      look: activeLook,
      text: body.slice(0, 120),
      emotion,
      pose: staged.pose,
      bg: staged.bg,
      shot: staged.shot,
      at: Date.now(),
    };
    roomRef.current.sendMessage(msg);
    setText('');
  };

  const leave = () => {
    roomRef.current?.destroy();
    roomRef.current = null;
    setMessages([]);
    setPhase('lobby');
    setStatus('로비로 돌아왔습니다');
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setStatus('초대 링크를 복사했습니다');
    } catch {
      setStatus(inviteUrl);
    }
  };

  const onCustomChange = (look: CharLook) => {
    setCustomLook(look);
    setCharacterId('custom');
    saveLook(look);
  };

  return (
    <div className="cc-root">
      <header className="cc-hud">
        <div className="cc-brand">
          <strong>컷톡</strong>
          <span>만화칸 채팅 · PeerJS · Comic Chat 계승</span>
          <Link href="/" className="cc-home-link">
            ← 아카이브
          </Link>
        </div>
        <p className="cc-status">{status}</p>
      </header>

      {phase === 'lobby' ? (
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
                    size={64}
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
                  size={64}
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
            <div className="cc-join-row">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim())}
                placeholder="방 코드"
                maxLength={12}
              />
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
                disabled={busy}
                onClick={() => startJoin()}
              >
                입장
              </button>
            </div>
          </div>
          <p className="cc-hint">
            감정·포즈·배경·구도가 문장에 맞춰 자동으로 바뀝니다. 휠로 직접 고정할 수도 있습니다.
            커스텀 룩은 이 기기에 저장되고, 메시지와 함께 상대에게 전달됩니다.
          </p>
        </main>
      ) : (
        <main className="cc-room">
          <div className="cc-room-bar">
            <span>
              방 <b>{roomCode}</b>
            </span>
            <button type="button" className="cc-btn cc-btn-ghost" onClick={copyInvite}>
              링크 복사
            </button>
            <button type="button" className="cc-btn cc-btn-ghost" onClick={leave}>
              나가기
            </button>
          </div>

          {qrSrc && (
            <details className="cc-invite">
              <summary>초대 QR</summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="방 초대 QR" width={160} height={160} />
              <code className="cc-invite-url">{inviteUrl}</code>
            </details>
          )}

          <div className="cc-strip" ref={stripRef}>
            {visible.length === 0 ? (
              <p className="cc-empty">아직 칸이 없습니다. 한마디 던져 보세요.</p>
            ) : (
              visible.map((m, i) => (
                <ComicPanel key={m.id} msg={m} mirror={i % 2 === 1} />
              ))
            )}
          </div>

          <footer className="cc-composer">
            <EmotionWheel value={emotionMode} onChange={setEmotionMode} />
            <PoseWheel value={poseMode} onChange={setPoseMode} />
            <div className="cc-input-row">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="대사 (최대 120자)"
                maxLength={120}
              />
              <button type="button" className="cc-btn" onClick={send}>
                칸 추가
              </button>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
