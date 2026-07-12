'use client';

import type { CharLook, Emotion, Pose } from '@/lib/comicchat/types';

type Props = {
  look: CharLook;
  emotion: Emotion;
  pose?: Pose;
  nick: string;
  size?: number;
  /** 패널용 전신 / 사이드 프리뷰 */
  fullBody?: boolean;
};

function bodyRx(body: CharLook['body']): number {
  if (body === 'wide') return 28;
  if (body === 'tall') return 20;
  return 24;
}
function bodyRy(body: CharLook['body']): number {
  if (body === 'tall') return 36;
  if (body === 'wide') return 26;
  return 30;
}

/** 전신 만화 아바타 (오리지널) */
export default function ComicAvatar({
  look,
  emotion,
  pose = 'idle',
  nick,
  size = 120,
  fullBody = true,
}: Props) {
  const vbH = fullBody ? 140 : 100;
  const faceY = fullBody ? 36 : 38;
  const bodyY = fullBody ? 78 : 62;
  const rx = bodyRx(look.body);
  const ry = bodyRy(look.body);

  return (
    <div
      className={`cc-avatar cc-emo-${emotion} cc-pose-${pose}${fullBody ? ' cc-avatar-full' : ''}`}
      style={{ width: size, height: size * (vbH / 100), ['--cc-hue' as string]: String(look.hue) }}
      title={`${nick} · ${look.name}`}
      aria-hidden
    >
      <svg viewBox={`0 0 100 ${vbH}`} width={size} height={size * (vbH / 100)}>
        <g className="cc-arms">
          <path className="cc-arm-l" d={`M${50 - rx + 4} ${bodyY - 8} Q18 ${bodyY + 10} 14 ${bodyY + 28}`} fill="none" strokeWidth="4" />
          <path className="cc-arm-r" d={`M${50 + rx - 4} ${bodyY - 8} Q82 ${bodyY + 10} 86 ${bodyY + 28}`} fill="none" strokeWidth="4" />
          <circle className="cc-hand-l" cx="14" cy={bodyY + 30} r="4.5" />
          <circle className="cc-hand-r" cx="86" cy={bodyY + 30} r="4.5" />
        </g>

        <ellipse className="cc-body" cx="50" cy={bodyY} rx={rx} ry={ry} />

        {fullBody && (
          <g className="cc-legs">
            <path d={`M${50 - 10} ${bodyY + ry - 4} L${44} ${vbH - 6}`} className="cc-leg" />
            <path d={`M${50 + 10} ${bodyY + ry - 4} L${56} ${vbH - 6}`} className="cc-leg" />
            <ellipse cx="44" cy={vbH - 4} rx="7" ry="3" className="cc-foot" />
            <ellipse cx="56" cy={vbH - 4} rx="7" ry="3" className="cc-foot" />
          </g>
        )}

        <circle className="cc-face" cx="50" cy={faceY} r="22" />

        {look.hair === 'bob' && (
          <path
            className="cc-hair"
            d={`M28 ${faceY - 2} Q30 ${faceY - 20} 50 ${faceY - 22} Q70 ${faceY - 20} 72 ${faceY - 2} L68 ${faceY - 4} Q50 ${faceY - 16} 32 ${faceY - 4} Z`}
          />
        )}
        {look.hair === 'spike' && (
          <path
            className="cc-hair"
            d={`M30 ${faceY - 6} L36 ${faceY - 24} L42 ${faceY - 8} L50 ${faceY - 26} L58 ${faceY - 8} L64 ${faceY - 24} L70 ${faceY - 6} Q50 ${faceY - 16} 30 ${faceY - 6} Z`}
          />
        )}
        {look.hair === 'ponytail' && (
          <>
            <path
              className="cc-hair"
              d={`M30 ${faceY - 4} Q32 ${faceY - 20} 50 ${faceY - 22} Q68 ${faceY - 20} 70 ${faceY - 4} Q50 ${faceY - 14} 30 ${faceY - 4} Z`}
            />
            <ellipse className="cc-hair" cx="72" cy={faceY + 6} rx="8" ry="14" />
          </>
        )}
        {look.hair === 'cap' && (
          <path
            className="cc-hair cc-cap"
            d={`M26 ${faceY - 4} Q50 ${faceY - 26} 74 ${faceY - 4} L70 ${faceY - 2} Q50 ${faceY - 18} 30 ${faceY - 2} Z`}
          />
        )}

        <g className="cc-eyes">
          <ellipse className="cc-eye-l" cx="42" cy={faceY - 2} rx="4" ry="5" />
          <ellipse className="cc-eye-r" cx="58" cy={faceY - 2} rx="4" ry="5" />
        </g>
        <path
          className="cc-mouth"
          d={`M40 ${faceY + 8} Q50 ${faceY + 14} 60 ${faceY + 8}`}
          fill="none"
          strokeWidth="2.5"
        />
        <path
          className="cc-brow-l"
          d={`M36 ${faceY - 10} L46 ${faceY - 8}`}
          fill="none"
          strokeWidth="2"
        />
        <path
          className="cc-brow-r"
          d={`M64 ${faceY - 10} L54 ${faceY - 8}`}
          fill="none"
          strokeWidth="2"
        />

        {look.accessory === 'glasses' && (
          <g className="cc-acc" fill="none" strokeWidth="2">
            <circle cx="42" cy={faceY - 2} r="7" />
            <circle cx="58" cy={faceY - 2} r="7" />
            <path d={`M49 ${faceY - 2} H51`} />
          </g>
        )}
        {look.accessory === 'scarf' && (
          <path
            className="cc-acc cc-scarf"
            d={`M34 ${faceY + 16} Q50 ${faceY + 26} 66 ${faceY + 16} L64 ${faceY + 34} Q50 ${faceY + 22} 36 ${faceY + 34} Z`}
          />
        )}
        {look.accessory === 'star' && (
          <path
            className="cc-acc cc-star"
            d="M72 18 L74 24 L80 24 L75 28 L77 34 L72 30 L67 34 L69 28 L64 24 L70 24 Z"
          />
        )}
        {look.accessory === 'bow' && (
          <path
            className="cc-acc cc-bow"
            d="M44 14 Q40 8 36 14 Q40 18 44 14 M56 14 Q60 8 64 14 Q60 18 56 14 M48 14 H52 V18 H48 Z"
          />
        )}

        <g className="cc-pose-fx">
          <path className="cc-heart-fx" d="M70 88 Q74 82 78 88 Q74 94 70 88" />
          <text className="cc-spark" x="78" y="20" fontSize="12">
            !
          </text>
        </g>
      </svg>
    </div>
  );
}
