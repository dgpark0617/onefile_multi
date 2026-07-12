import type { BgId, Emotion, Pose, Shot } from './types';

export type StagingInput = {
  text: string;
  emotion: Emotion;
  prevPeerId?: string;
  peerId: string;
  panelIndex: number;
};

export type Staging = {
  bg: BgId;
  shot: Shot;
  pose: Pose;
  mirror: boolean;
};

const EMOTION_BG: Record<Emotion, BgId[]> = {
  neutral: ['room', 'cafe', 'office'],
  happy: ['park', 'cafe', 'stage'],
  laugh: ['cafe', 'stage', 'park'],
  angry: ['office', 'rain', 'night'],
  sad: ['rain', 'night', 'room'],
  surprise: ['stage', 'night', 'park'],
  shy: ['cafe', 'room', 'park'],
  cool: ['night', 'office', 'stage'],
  love: ['park', 'cafe', 'night'],
  think: ['room', 'office', 'cafe'],
};

const EMOTION_POSE: Record<Emotion, Pose> = {
  neutral: 'idle',
  happy: 'wave',
  laugh: 'cheer',
  angry: 'fist',
  sad: 'shrug',
  surprise: 'wave',
  shy: 'idle',
  cool: 'point',
  love: 'heart',
  think: 'think',
};

function pickBg(emotion: Emotion, text: string, index: number): BgId {
  const t = text.toLowerCase();
  if (/비|우산|젖/.test(t)) return 'rain';
  if (/밤|달|야경|심야/.test(t)) return 'night';
  if (/카페|커피|라떼/.test(t)) return 'cafe';
  if (/공원|산책|나무|꽃/.test(t)) return 'park';
  if (/회사|회의|일하|야근/.test(t)) return 'office';
  if (/무대|공연|노래|쇼/.test(t)) return 'stage';
  if (/집|방|침대|집콕/.test(t)) return 'room';
  const list = EMOTION_BG[emotion];
  return list[index % list.length];
}

function pickShot(emotion: Emotion, text: string): Shot {
  const len = text.trim().length;
  if (emotion === 'surprise' || emotion === 'angry') return 'close';
  if (emotion === 'think' || emotion === 'shy') return 'high';
  if (emotion === 'cool') return 'low';
  if (len > 60 || emotion === 'laugh') return 'wide';
  if (len < 12) return 'close';
  return 'medium';
}

function pickPose(emotion: Emotion, text: string, manual?: Pose | 'auto'): Pose {
  if (manual && manual !== 'auto') return manual;
  const t = text;
  if (/안녕|하이|헬로|bye|잘가/i.test(t)) return 'wave';
  if (/몰라|글쎄|어쩔|shrug/i.test(t)) return 'shrug';
  if (/화이팅|파이팅|가자|덤벼/.test(t)) return 'fist';
  if (/아오|망했|실수|ㅠㅠ/.test(t) && emotion === 'sad') return 'facepalm';
  if (/사랑|좋아|❤|♥/.test(t)) return 'heart';
  if (/저쪽|여기|봐|저기/.test(t)) return 'point';
  if (/\?|왜|음|고민/.test(t)) return 'think';
  if (/야호|만세|축하|ㅎㅎ|ㅋㅋ/.test(t)) return 'cheer';
  return EMOTION_POSE[emotion];
}

/** 문장·감정·대화 흐름으로 배경·구도·포즈 자동 연출 */
export function stagePanel(
  input: StagingInput,
  poseMode: Pose | 'auto' = 'auto',
): Staging {
  const sameSpeaker = Boolean(input.prevPeerId && input.prevPeerId === input.peerId);
  const mirror = input.panelIndex % 2 === 1;

  return {
    bg: pickBg(input.emotion, input.text, input.panelIndex),
    shot: sameSpeaker && input.emotion === 'neutral'
      ? 'medium'
      : pickShot(input.emotion, input.text),
    pose: pickPose(input.emotion, input.text, poseMode),
    mirror,
  };
}
