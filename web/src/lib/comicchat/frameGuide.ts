import type { Emotion, Pose } from './types';

/**
 * Comic Chat / 컷톡 스프라이트 가이드
 *
 * 1) **기본 방향**: 모든 팩 프레임은 **오른쪽을 향한 3/4 전신**으로 그립니다.
 * 2) **마주보기**: `facing: 'left'`일 때 CSS `scaleX(-1)` — 별도 좌향 아트 불필요.
 * 3) **프레임 우선순위**: pose( idle 제외 ) → emotion → idle
 * 4) **실사(photo) 팩**: 한 장의 초상 + 좌우 반전만. 감정은 말풍선·배경·이모지 배지로 보조.
 * 5) **메시지 전송**: 이미지 바이너리 X — `packId + emotion + pose` (+ photoUrl은 입장 시 1회)
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
