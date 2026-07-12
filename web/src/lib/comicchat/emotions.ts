import { EMOTIONS, type Emotion } from './types';

/** 문장에서 감정 힌트 — 수동 휠이 우선, 이건 '자동'일 때만 */
export function inferEmotion(text: string): Emotion {
  const t = text.trim();
  if (!t) return 'neutral';

  if (/[❤♥💕😍🥰]|사랑|좋아|설레/.test(t)) return 'love';
  if (/ㅋ{2,}|ㅎ{2,}|lol|ㅎㅎ|ㅋㅋ/.test(t)) return 'laugh';
  if (/ㅠ+|ㅜ+|슬프|울|힘들/.test(t)) return 'sad';
  if (/화나|짜증|분노|열받|ㅅㅂ|ㅂㅅ/.test(t)) return 'angry';
  if (/\?{2,}|왜|뭐지|고민|음\.{2,}/.test(t)) return 'think';
  if (/!{2,}|헐|와+|대박|놀랐|깜짝/.test(t)) return 'surprise';
  if (/ㅎㅎ?$|~+|ㅎㅎ/.test(t) && t.length < 12) return 'shy';
  if (/쿨|담담|알겠|ㅇㅋ|ok/i.test(t)) return 'cool';
  if (/!|좋|신나|야호|ㅎㅎ/.test(t)) return 'happy';

  return 'neutral';
}

export function isEmotion(v: string): v is Emotion {
  return (EMOTIONS as readonly string[]).includes(v);
}

/** 감정 휠 배치 (시계 방향) */
export const WHEEL_ORDER: Emotion[] = [
  'happy',
  'laugh',
  'surprise',
  'love',
  'shy',
  'sad',
  'angry',
  'think',
  'cool',
  'neutral',
];
