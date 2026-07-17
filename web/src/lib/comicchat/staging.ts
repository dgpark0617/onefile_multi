import type { BgId, BubbleType, Emotion, Pose, Shot } from './types';

export type StagingInput = {
  text: string;
  emotion: Emotion;
  bubble: BubbleType;
  prevPeerId?: string;
  peerId: string;
  panelIndex: number;
  /** 직전 칸/발화 배경 — 장면 키워드 없으면 유지 (합연출용) */
  prevBg?: BgId;
};

export type Staging = {
  bg: BgId;
  shot: Shot;
  pose: Pose;
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

function pickExplicitBg(text: string): BgId | null {
  const t = text.toLowerCase();
  if (/비|우산|젖|폭우|장마/.test(t)) return 'rain';
  if (/밤|달|야경|심야|별|새벽/.test(t)) return 'night';
  if (/카페|커피|라떼|브런치|술|술집|바\b|맥주/.test(t)) return 'cafe';
  if (/공원|산책|나무|꽃|해변|바다|해변가|피크닉/.test(t)) return 'park';
  if (/회사|회의|일하|야근|학교|교실|수업|병원|사무/.test(t)) return 'office';
  if (/무대|공연|노래|쇼|콘서트|발표|축하/.test(t)) return 'stage';
  if (/집|방|침대|집콕|소파|거실|침실/.test(t)) return 'room';
  return null;
}

function pickBg(emotion: Emotion, text: string, index: number, prevBg?: BgId): BgId {
  const explicit = pickExplicitBg(text);
  if (explicit) return explicit;
  // 감정만으로 배경을 매번 바꾸면 합연출이 깨짐 → 직전 장면 유지
  if (prevBg) return prevBg;
  const list = EMOTION_BG[emotion];
  return list[index % list.length];
}

function pickShot(emotion: Emotion, text: string, bubble: BubbleType): Shot {
  if (bubble === 'shout') return 'close';
  if (bubble === 'thought') return 'high';
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
  if (/안녕|하이|헬로|bye|잘가|반가|hi\b|hello/i.test(t)) return 'wave';
  if (/몰라|글쎄|어쩔|shrug|모르겠|글쎄요/.test(t)) return 'shrug';
  if (/화이팅|파이팅|가자|덤벼|해보자|가보자/.test(t)) return 'fist';
  if (/아오|망했|실수|ㅠㅠ|에휴|젠장/.test(t) && (emotion === 'sad' || emotion === 'angry')) return 'facepalm';
  if (/사랑|좋아|❤|♥|설레|고백/.test(t)) return 'heart';
  if (/저쪽|여기|봐|저기|거기|봐봐|이쪽/.test(t)) return 'point';
  if (/\?|왜|음|고민|어떻게|그럴까/.test(t)) return 'think';
  if (/야호|만세|축하|ㅎㅎ|ㅋㅋ|우와|대박|굿|nice/i.test(t)) return 'cheer';
  return EMOTION_POSE[emotion];
}

export function inferBubble(text: string, emotion: Emotion): BubbleType {
  const t = text.trim();
  if (/!{2,}|아+|으아|야+|헐|죽어|닥쳐|시끄|진짜\?{2,}/.test(t) || emotion === 'angry' || emotion === 'surprise') {
    return 'shout';
  }
  if (/\?{2,}|음+|생각|어쩌면|만약|…|\.\.\.|혹시|글쎄/.test(t) || emotion === 'think') {
    return 'thought';
  }
  return 'speech';
}

/** 문장·감정·풍선으로 배경·구도·포즈 자동 연출 */
export function stagePanel(
  input: StagingInput,
  poseMode: Pose | 'auto' = 'auto',
): Staging {
  return {
    bg: pickBg(input.emotion, input.text, input.panelIndex, input.prevBg),
    shot: pickShot(input.emotion, input.text, input.bubble),
    pose: pickPose(input.emotion, input.text, poseMode),
  };
}
