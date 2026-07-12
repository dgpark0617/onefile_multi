'use client';

import { EMOTION_LABEL, type Emotion } from '@/lib/comicchat/types';
import { WHEEL_ORDER } from '@/lib/comicchat/emotions';

type Props = {
  value: Emotion | 'auto';
  onChange: (v: Emotion | 'auto') => void;
};

export default function EmotionWheel({ value, onChange }: Props) {
  return (
    <div className="cc-wheel" role="group" aria-label="감정">
      <button
        type="button"
        className={`cc-wheel-btn cc-wheel-auto${value === 'auto' ? ' active' : ''}`}
        onClick={() => onChange('auto')}
        title="문장으로 자동"
      >
        자동
      </button>
      {WHEEL_ORDER.map((emo) => (
        <button
          key={emo}
          type="button"
          className={`cc-wheel-btn cc-emo-chip-${emo}${value === emo ? ' active' : ''}`}
          onClick={() => onChange(emo)}
          title={EMOTION_LABEL[emo]}
        >
          {EMOTION_LABEL[emo]}
        </button>
      ))}
    </div>
  );
}
