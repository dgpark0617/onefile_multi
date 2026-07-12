'use client';

import type { CharLook, Emotion, Pose } from '@/lib/comicchat/types';

type Props = {
  look: CharLook;
  emotion: Emotion;
  pose?: Pose;
  nick: string;
  size?: number;
};

function bodyRx(body: CharLook['body']): number {
  if (body === 'wide') return 30;
  if (body === 'tall') return 22;
  return 26;
}
function bodyRy(body: CharLook['body']): number {
  if (body === 'tall') return 32;
  if (body === 'wide') return 24;
  return 28;
}

/** 오리지널 심플 아바타 — 룩·감정·포즈 */
export default function ComicAvatar({
  look,
  emotion,
  pose = 'idle',
  nick,
  size = 88,
}: Props) {
  const rx = bodyRx(look.body);
  const ry = bodyRy(look.body);

  return (
    <div
      className={`cc-avatar cc-emo-${emotion} cc-pose-${pose}`}
      style={{ width: size, height: size, ['--cc-hue' as string]: String(look.hue) }}
      title={`${nick} · ${look.name}`}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* arms / pose props */}
        <g className="cc-arms">
          <path className="cc-arm-l" d="M28 58 Q18 68 16 78" fill="none" strokeWidth="4" />
          <path className="cc-arm-r" d="M72 58 Q82 68 84 78" fill="none" strokeWidth="4" />
          <circle className="cc-hand-l" cx="16" cy="80" r="4" />
          <circle className="cc-hand-r" cx="84" cy="80" r="4" />
        </g>

        <ellipse className="cc-body" cx="50" cy="62" rx={rx} ry={ry} />
        <circle className="cc-face" cx="50" cy="38" r="22" />

        {/* hair */}
        {look.hair === 'bob' && (
          <path
            className="cc-hair"
            d="M28 36 Q30 18 50 16 Q70 18 72 36 L68 34 Q50 22 32 34 Z"
          />
        )}
        {look.hair === 'spike' && (
          <path
            className="cc-hair"
            d="M30 30 L36 12 L42 28 L50 10 L58 28 L64 12 L70 30 Q50 20 30 30 Z"
          />
        )}
        {look.hair === 'ponytail' && (
          <>
            <path className="cc-hair" d="M30 34 Q32 18 50 16 Q68 18 70 34 Q50 24 30 34 Z" />
            <ellipse className="cc-hair" cx="72" cy="42" rx="8" ry="14" />
          </>
        )}
        {look.hair === 'cap' && (
          <path className="cc-hair cc-cap" d="M26 34 Q50 10 74 34 L70 36 Q50 20 30 36 Z" />
        )}

        <g className="cc-eyes">
          <ellipse className="cc-eye-l" cx="42" cy="36" rx="4" ry="5" />
          <ellipse className="cc-eye-r" cx="58" cy="36" rx="4" ry="5" />
        </g>
        <path className="cc-mouth" d="M40 46 Q50 52 60 46" fill="none" strokeWidth="2.5" />
        <path className="cc-brow-l" d="M36 28 L46 30" fill="none" strokeWidth="2" />
        <path className="cc-brow-r" d="M64 28 L54 30" fill="none" strokeWidth="2" />

        {/* accessories */}
        {look.accessory === 'glasses' && (
          <g className="cc-acc" fill="none" strokeWidth="2">
            <circle cx="42" cy="36" r="7" />
            <circle cx="58" cy="36" r="7" />
            <path d="M49 36 H51" />
          </g>
        )}
        {look.accessory === 'scarf' && (
          <path className="cc-acc cc-scarf" d="M34 52 Q50 62 66 52 L64 70 Q50 58 36 70 Z" />
        )}
        {look.accessory === 'star' && (
          <path
            className="cc-acc cc-star"
            d="M72 22 L74 28 L80 28 L75 32 L77 38 L72 34 L67 38 L69 32 L64 28 L70 28 Z"
          />
        )}
        {look.accessory === 'bow' && (
          <path
            className="cc-acc cc-bow"
            d="M44 18 Q40 12 36 18 Q40 22 44 18 M56 18 Q60 12 64 18 Q60 22 56 18 M48 18 H52 V22 H48 Z"
          />
        )}

        {/* pose extras */}
        <g className="cc-pose-fx">
          <path className="cc-heart-fx" d="M70 70 Q74 64 78 70 Q74 76 70 70" />
          <text className="cc-spark" x="78" y="24" fontSize="10">
            !
          </text>
        </g>
      </svg>
    </div>
  );
}
