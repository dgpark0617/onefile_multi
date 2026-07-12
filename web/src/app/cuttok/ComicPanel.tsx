'use client';

import type { ComicMsg } from '@/lib/comicchat/types';
import { BG_LABEL, EMOTION_LABEL, POSE_LABEL, SHOT_LABEL } from '@/lib/comicchat/types';
import ComicAvatar from './ComicAvatar';

type Props = {
  msg: ComicMsg;
  mirror?: boolean;
};

export default function ComicPanel({ msg, mirror }: Props) {
  const flipped = mirror ?? false;
  return (
    <article
      className={`cc-panel cc-bg-${msg.bg} cc-shot-${msg.shot}${flipped ? ' cc-panel-mirror' : ''}`}
    >
      <div className="cc-panel-bg" aria-hidden />
      <div className="cc-panel-stage">
        <div className="cc-avatar-wrap">
          <ComicAvatar
            look={msg.look}
            emotion={msg.emotion}
            pose={msg.pose}
            nick={msg.nick}
          />
        </div>
        <div className="cc-bubble">
          <p className="cc-bubble-text">{msg.text}</p>
          <span className="cc-bubble-meta">
            {msg.nick} · {EMOTION_LABEL[msg.emotion]} · {POSE_LABEL[msg.pose]} ·{' '}
            {BG_LABEL[msg.bg]} · {SHOT_LABEL[msg.shot]}
          </span>
        </div>
      </div>
    </article>
  );
}
