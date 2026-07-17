'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { BubbleType, ComicPanelModel } from '@/lib/comicchat/types';
import { panelZoom, placeActors } from '@/lib/comicchat/placeActors';
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
  if (n >= 4) return 48;
  if (n >= 3) return 56;
  if (n === 2) return 70;
  return 84;
}

export default function ComicPanel({ panel }: Props) {
  const n = panel.lines.length;
  const size = avatarSize(n);
  const layouts = useMemo(() => placeActors(panel.lines), [panel.lines]);
  const layoutById = useMemo(
    () => new Map(layouts.map((l) => [l.lineId, l])),
    [layouts],
  );

  const panelStyle = {
    '--cc-panel-zoom': panelZoom(panel.shot),
  } as CSSProperties;

  return (
    <article
      className={`cc-panel cc-bg-${panel.bg} cc-shot-${panel.shot} cc-actors-${n}`}
      style={panelStyle}
    >
      <div className="cc-panel-bg" aria-hidden />
      <div className="cc-panel-stage">
        {panel.lines.map((line) => {
          const layout = layoutById.get(line.id);
          const side = layout?.side ?? (panel.lines.indexOf(line) % 2 === 0 ? 'left' : 'right');
          const actorStyle: CSSProperties = {
            zIndex: layout?.zIndex,
            transform: layout?.translateY ? `translateY(${layout.translateY}px)` : undefined,
          };

          return (
            <div
              key={line.id}
              className={`cc-actor cc-actor-${side}${layout?.row ? ` cc-actor-row-${layout.row}` : ''}`}
              style={actorStyle}
            >
              <div
                className={bubbleClass(line.bubble)}
                style={{ maxWidth: layout?.balloonMaxWidth }}
              >
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
                  facing={layout?.facing ?? (side === 'right' ? 'left' : 'right')}
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
