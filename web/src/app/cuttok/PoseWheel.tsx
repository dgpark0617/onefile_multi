'use client';

import { POSE_LABEL, POSES, type Pose } from '@/lib/comicchat/types';

type Props = {
  value: Pose | 'auto';
  onChange: (v: Pose | 'auto') => void;
};

export default function PoseWheel({ value, onChange }: Props) {
  return (
    <div className="cc-wheel" role="group" aria-label="포즈">
      <button
        type="button"
        className={`cc-wheel-btn cc-wheel-auto${value === 'auto' ? ' active' : ''}`}
        onClick={() => onChange('auto')}
      >
        포즈자동
      </button>
      {POSES.map((p) => (
        <button
          key={p}
          type="button"
          className={`cc-wheel-btn${value === p ? ' active' : ''}`}
          onClick={() => onChange(p)}
        >
          {POSE_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
