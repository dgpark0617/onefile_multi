'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  framingFromShot,
  type BubbleType,
  type ComicPanelModel,
} from '@/lib/comicchat/types';
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

function bubbleAttachClass(attach: string[] | undefined): string {
  if (!attach?.length) return '';
  return attach.map((edge) => `cc-bubble-attach-${edge}`).join(' ');
}

/** 모바일·PC 동일 구도. 인원·프레이밍에 따른 크기. */
function avatarSize(n: number, framing: string): number {
  const base = n >= 4 ? 52 : n >= 3 ? 64 : n === 2 ? 78 : 96;
  if (framing === 'full') return Math.round(base * 1.15);
  if (framing === 'close') return Math.round(base * 1.05);
  return base;
}

export default function ComicPanel({ panel }: Props) {
  const n = panel.lines.length;
  const framing = framingFromShot(panel.shot);
  const size = avatarSize(n, framing);
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
      className={`cc-panel cc-bg-${panel.bg} cc-shot-${panel.shot} cc-framing-${framing} cc-actors-${n}`}
      style={panelStyle}
    >
      <div className="cc-panel-bg" aria-hidden />
      <div className="cc-panel-stage">
        {panel.lines.map((line) => {
          const layout = layoutById.get(line.id);
          const side =
            layout?.side ?? (panel.lines.indexOf(line) % 2 === 0 ? 'left' : 'right');
          const actorStyle: CSSProperties = {
            zIndex: layout?.zIndex,
            transform: layout?.translateY
              ? `translateY(${layout.translateY}px)`
              : undefined,
          };

          return (
            <div
              key={line.id}
              className={`cc-actor cc-actor-${side} cc-actor-row-${layout?.row ?? 0}`}
              style={actorStyle}
            >
              <div
                className={`${bubbleClass(line.bubble)} ${bubbleAttachClass(layout?.balloonAttach)}${layout?.balloonCompact ? ' cc-bubble-compact' : ''}`}
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
                  framing={framing}
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
