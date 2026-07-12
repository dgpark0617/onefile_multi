'use client';

import { EMOTION_LABEL, WHEEL_CLOCK, type Emotion } from '@/lib/comicchat/types';

type Props = {
  value: Emotion;
  onChange: (v: Emotion) => void;
  /** 자동 추론 모드 */
  auto: boolean;
  onAutoChange: (auto: boolean) => void;
};

/** 원작식 원형 감정 휠 */
export default function EmotionWheel({ value, onChange, auto, onAutoChange }: Props) {
  const n = WHEEL_CLOCK.length;
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 76;
  const rInner = 28;

  return (
    <div className="cc-emo-wheel-wrap">
      <svg
        className="cc-emo-wheel"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="group"
        aria-label="감정 휠"
      >
        <circle cx={cx} cy={cy} r={rOuter + 4} className="cc-wheel-ring" />
        {WHEEL_CLOCK.map((emo, i) => {
          const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
          const mid = (a0 + a1) / 2;
          const x1 = cx + Math.cos(a0) * rInner;
          const y1 = cy + Math.sin(a0) * rInner;
          const x2 = cx + Math.cos(a0) * rOuter;
          const y2 = cy + Math.sin(a0) * rOuter;
          const x3 = cx + Math.cos(a1) * rOuter;
          const y3 = cy + Math.sin(a1) * rOuter;
          const x4 = cx + Math.cos(a1) * rInner;
          const y4 = cy + Math.sin(a1) * rInner;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = [
            `M ${x1} ${y1}`,
            `L ${x2} ${y2}`,
            `A ${rOuter} ${rOuter} 0 ${large} 1 ${x3} ${y3}`,
            `L ${x4} ${y4}`,
            `A ${rInner} ${rInner} 0 ${large} 0 ${x1} ${y1}`,
            'Z',
          ].join(' ');
          const lx = cx + Math.cos(mid) * ((rInner + rOuter) / 2);
          const ly = cy + Math.sin(mid) * ((rInner + rOuter) / 2);
          const active = !auto && value === emo;
          return (
            <g key={emo}>
              <path
                d={d}
                className={`cc-wheel-seg cc-wheel-seg-${emo}${active ? ' active' : ''}`}
                onClick={() => {
                  onAutoChange(false);
                  onChange(emo);
                }}
              />
              <text
                x={lx}
                y={ly}
                className="cc-wheel-label"
                textAnchor="middle"
                dominantBaseline="middle"
                onClick={() => {
                  onAutoChange(false);
                  onChange(emo);
                }}
              >
                {EMOTION_LABEL[emo].slice(0, 2)}
              </text>
            </g>
          );
        })}
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 2}
          className={`cc-wheel-hub${auto ? ' active' : ''}`}
          onClick={() => onAutoChange(true)}
        />
        <text
          x={cx}
          y={cy}
          className="cc-wheel-hub-text"
          textAnchor="middle"
          dominantBaseline="middle"
          onClick={() => onAutoChange(true)}
        >
          {auto ? '자동' : EMOTION_LABEL[value].slice(0, 2)}
        </text>
      </svg>
      <p className="cc-wheel-hint">
        {auto ? '문장으로 표정 자동' : `선택: ${EMOTION_LABEL[value]}`}
      </p>
    </div>
  );
}
