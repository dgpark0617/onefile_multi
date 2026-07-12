'use client';

import type { BubbleType, ComicPanelModel } from '@/lib/comicchat/types';
import ComicAvatar from './ComicAvatar';

type Props = {
  panel: ComicPanelModel;
};

function bubbleClass(t: BubbleType): string {
  if (t === 'thought') return 'cc-bubble cc-bubble-thought';
  if (t === 'shout') return 'cc-bubble cc-bubble-shout';
  return 'cc-bubble cc-bubble-speech';
}

/** 모바일·PC 동일 구도. 인원 수에 따른 크기만 조정. */
function avatarSize(n: number): number {
  if (n >= 3) return 56;
  if (n === 2) return 70;
  return 84;
}

export default function ComicPanel({ panel }: Props) {
  const n = panel.lines.length;
  const size = avatarSize(n);

  return (
    <article
      className={`cc-panel cc-bg-${panel.bg} cc-shot-${panel.shot} cc-actors-${n}`}
    >
      <div className="cc-panel-bg" aria-hidden />
      <div className="cc-panel-stage">
        {panel.lines.map((line, i) => {
          const side = i % 2 === 0 ? 'left' : 'right';
          return (
            <div key={line.id} className={`cc-actor cc-actor-${side}`}>
              <div className={bubbleClass(line.bubble)}>
                <p className="cc-bubble-text">{line.text}</p>
                <span className="cc-bubble-tail" aria-hidden />
              </div>
              <div className="cc-actor-body">
                <ComicAvatar
                  look={line.look}
                  emotion={line.emotion}
                  pose={line.pose}
                  nick={line.nick}
                  size={size}
                  fullBody
                />
                <span className="cc-actor-name">{line.nick}</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
