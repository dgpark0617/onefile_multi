'use client';

import { useEffect, useState } from 'react';
import type { CharLook, Emotion, Framing, Pose } from '@/lib/comicchat/types';
import { resolveAvatarFrameAsync } from '@/lib/comicchat/resolveFrame';

type Props = {
  look: CharLook;
  emotion: Emotion;
  pose?: Pose;
  nick: string;
  size?: number;
  /** @deprecated framing 사용 */
  fullBody?: boolean;
  /** Comic Chat식 전신 / 상반신 / 클로즈업 */
  framing?: Framing;
  /** 대화 상대를 향한 시선 */
  facing?: 'left' | 'right';
};

/** 전신 스프라이트 팩 — framing으로 상반신/전신 크롭 */
export default function ComicAvatar({
  look,
  emotion,
  pose = 'idle',
  nick,
  size = 120,
  fullBody = true,
  framing,
  facing = 'right',
}: Props) {
  const frameMode: Framing =
    framing ?? (fullBody === false ? 'bust' : 'full');

  // 전신 팩 aspect 360:700 ≈ 0.51
  const aspect =
    frameMode === 'full' ? 700 / 360 : frameMode === 'bust' ? 1.05 : 0.95;
  const height = Math.round(size * aspect);
  const [src, setSrc] = useState('');
  const [flip, setFlip] = useState(false);
  const [badge, setBadge] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    resolveAvatarFrameAsync(look, emotion, pose, facing).then((frame) => {
      if (!alive) return;
      setSrc(frame.src);
      setFlip(frame.flip);
      setBadge(frame.emotionBadge);
    });
    return () => {
      alive = false;
    };
  }, [look, emotion, pose, facing]);

  const isPhoto = look.packId === 'photo';

  return (
    <div
      className={`cc-avatar cc-avatar-img cc-framing-${frameMode} cc-emo-${emotion} cc-pose-${pose} cc-facing-${facing}${isPhoto ? ' cc-avatar-photo' : ''}`}
      style={{ width: size, height }}
      title={`${nick} · ${look.name}`}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`cc-avatar-sprite${flip ? ' cc-avatar-flip' : ''}`}
          src={src}
          alt=""
          draggable={false}
          decoding="async"
        />
      ) : (
        <div className="cc-avatar-placeholder" style={{ width: size, height }} />
      )}
      {badge ? <span className="cc-avatar-emotion-badge">{badge}</span> : null}
    </div>
  );
}
