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

export default function ComicPanel({ panel }: Props) {
  const n = panel.lines.length;
  return (
    <article className={`cc-panel cc-bg-${panel.bg} cc-shot-${panel.shot} cc-actors-${n}`}>
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
                  size={n >= 3 ? 72 : n === 2 ? 88 : 110}
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
