'use client';

import type { BubbleType, ComicPanelModel } from '@/lib/comicchat/types';
import ComicAvatar from './ComicAvatar';

type Props = {
  panel: ComicPanelModel;
  /** 모바일: 더 작은 전신으로 컷 밀도↑ */
  compact?: boolean;
};

function bubbleClass(t: BubbleType): string {
  if (t === 'thought') return 'cc-bubble cc-bubble-thought';
  if (t === 'shout') return 'cc-bubble cc-bubble-shout';
  return 'cc-bubble cc-bubble-speech';
}

export default function ComicPanel({ panel, compact }: Props) {
  const n = panel.lines.length;
  const size = compact
    ? n >= 3
      ? 44
      : n === 2
        ? 56
        : 68
    : n >= 3
      ? 56
      : n === 2
        ? 72
        : 88;

  return (
    <article
      className={`cc-panel cc-bg-${panel.bg} cc-shot-${panel.shot} cc-actors-${n}${compact ? ' cc-panel-compact' : ''}`}
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
