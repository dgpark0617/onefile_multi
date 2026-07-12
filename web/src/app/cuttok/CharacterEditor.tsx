'use client';

import {
  ACCESSORIES,
  BODIES,
  HAIRS,
  type Accessory,
  type BodyShape,
  type CharLook,
  type Hair,
} from '@/lib/comicchat/types';
import ComicAvatar from './ComicAvatar';

const HAIR_LABEL: Record<Hair, string> = {
  none: '민머리',
  bob: '단발',
  spike: '스파이크',
  ponytail: '묶음',
  cap: '모자',
};

const ACC_LABEL: Record<Accessory, string> = {
  none: '없음',
  glasses: '안경',
  scarf: '스카프',
  star: '별',
  bow: '리본',
};

const BODY_LABEL: Record<BodyShape, string> = {
  round: '둥글',
  tall: '키큼',
  wide: '통통',
};

type Props = {
  look: CharLook;
  onChange: (look: CharLook) => void;
};

export default function CharacterEditor({ look, onChange }: Props) {
  const set = <K extends keyof CharLook>(key: K, value: CharLook[K]) => {
    onChange({ ...look, [key]: value });
  };

  return (
    <div className="cc-editor">
      <div className="cc-editor-preview">
        <ComicAvatar look={look} emotion="happy" pose="wave" nick={look.name} size={96} />
        <label className="cc-field">
          이름
          <input
            value={look.name}
            maxLength={8}
            onChange={(e) => set('name', e.target.value.slice(0, 8))}
          />
        </label>
      </div>

      <label className="cc-field">
        색상 {look.hue}°
        <input
          type="range"
          min={0}
          max={360}
          value={look.hue}
          onChange={(e) => set('hue', Number(e.target.value))}
        />
      </label>

      <div className="cc-editor-row">
        <span>머리</span>
        <div className="cc-chip-row">
          {HAIRS.map((h) => (
            <button
              key={h}
              type="button"
              className={`cc-wheel-btn${look.hair === h ? ' active' : ''}`}
              onClick={() => set('hair', h)}
            >
              {HAIR_LABEL[h]}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-editor-row">
        <span>액세서리</span>
        <div className="cc-chip-row">
          {ACCESSORIES.map((a) => (
            <button
              key={a}
              type="button"
              className={`cc-wheel-btn${look.accessory === a ? ' active' : ''}`}
              onClick={() => set('accessory', a)}
            >
              {ACC_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-editor-row">
        <span>체형</span>
        <div className="cc-chip-row">
          {BODIES.map((b) => (
            <button
              key={b}
              type="button"
              className={`cc-wheel-btn${look.body === b ? ' active' : ''}`}
              onClick={() => set('body', b)}
            >
              {BODY_LABEL[b]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
