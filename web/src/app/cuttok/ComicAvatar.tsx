'use client';

import { useEffect, useState } from 'react';
import type { CharLook, Emotion, Pose } from '@/lib/comicchat/types';
import { resolveAvatarFrameAsync } from '@/lib/comicchat/resolveFrame';

type Props = {
  look: CharLook;
  emotion: Emotion;
  pose?: Pose;
  nick: string;
  size?: number;
  /** 패널용 전신 / 사이드 프리뷰 */
  fullBody?: boolean;
  /** 대화 상대를 향한 시선 (Comic Chat facing) */
  facing?: 'left' | 'right';
};

/** 이미지 팩 / 실사 초상 아바타 */
export default function ComicAvatar({
  look,
  emotion,
  pose = 'idle',
  nick,
  size = 120,
  fullBody = true,
  facing = 'right',
}: Props) {
  const aspect = 1; // 치비 머그샷 팩은 정사각
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
      className={`cc-avatar cc-avatar-img cc-emo-${emotion} cc-pose-${pose} cc-facing-${facing}${fullBody ? ' cc-avatar-full' : ''}${isPhoto ? ' cc-avatar-photo' : ''}`}
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
          width={size}
          height={height}
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
