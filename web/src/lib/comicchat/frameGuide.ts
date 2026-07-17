import type { Emotion, Pose } from './types';

/**
 * Comic Chat / 컷톡 스프라이트 가이드
 *
 * 1) **기본**: 전신(최소 가슴 아래~허벅지) 투명 PNG, 가능하면 3/4 또는 정면
 * 2) **마주보기**: `facing: 'left'`일 때 CSS `scaleX(-1)`
 * 3) **프레이밍 (Comic Chat 줌)**: 같은 전신 이미지로
 *    - `full` 전신 표시 (wide/low)
 *    - `bust` 상반신·가슴 아래까지 (medium/high)
 *    - `close` 얼굴 클로즈업 (close)
 * 4) **프레임 우선순위**: pose( idle 제외 ) → emotion → idle
 * 5) **실사(photo)**: 초상 1장 + 좌우 반전, 감정은 배지
 * 6) **메시지**: `packId + emotion + pose` (+ photoUrl은 입장 시 1회)
 */

export const POSE_FRAMES: readonly Pose[] = [
  'wave',
  'shrug',
  'fist',
  'facepalm',
  'heart',
  'point',
  'think',
  'cheer',
] as const;

export const EMOTION_FRAMES: readonly Emotion[] = [
  'neutral',
  'happy',
  'laugh',
  'angry',
  'sad',
  'surprise',
  'shy',
  'cool',
  'love',
  'think',
] as const;

export type FrameKey = Emotion | Pose;

/** pose → emotion 대체 (팩에 pose 파일 없을 때) */
export const POSE_EMOTION_FALLBACK: Partial<Record<Pose, Emotion>> = {
  wave: 'happy',
  shrug: 'neutral',
  fist: 'angry',
  facepalm: 'sad',
  heart: 'love',
  point: 'cool',
  think: 'think',
  cheer: 'laugh',
};

export function resolveFrameKey(emotion: Emotion, pose: Pose): FrameKey {
  if (pose !== 'idle') return pose;
  return emotion;
}
