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

/**
 * 배경은 기본 sticky.
 * 짧은 단어(방/집/달/꽃/축하…)에 반응하면 장면이 튀므로
 * “장면 전환 의도”가 분명한 표현만 인정한다.
 */
function pickExplicitBg(text: string): BgId | null {
  const t = text.toLowerCase();
  if (/비가\s*와|비\s*오|폭우|장마|우산/.test(t)) return 'rain';
  if (/밤거리|야경|심야|밤하늘|달빛/.test(t)) return 'night';
  if (/카페|커피숍|커피집|라떼\s*한\s*잔|술집|호프집/.test(t)) return 'cafe';
  if (/공원에|산책하|피크닉|해변에|바다에/.test(t)) return 'park';
  if (/회사에서|회의실|야근|교실|학교에서|병원에서/.test(t)) return 'office';
  if (/무대\s*위|콘서트|공연\s*장|라이브\s*쇼/.test(t)) return 'stage';
  if (/우리\s*집\s*(으로|에서)|집콕\s*중|거실에서\s*놀|침실에서\s*쉬/.test(t)) return 'room';
  // 명시 전환 명령
  if (/배경\s*(을\s*)?(카페|공원|밤|회사|무대|비|집|방)/.test(t)) {
    if (/카페/.test(t)) return 'cafe';
    if (/공원/.test(t)) return 'park';
    if (/밤/.test(t)) return 'night';
    if (/회사/.test(t)) return 'office';
    if (/무대/.test(t)) return 'stage';
    if (/비/.test(t)) return 'rain';
    return 'room';
  }
  return null;
}

function pickBg(emotion: Emotion, text: string, index: number, prevBg?: BgId): BgId {
  const explicit = pickExplicitBg(text);
  if (explicit) return explicit;
  // 장면 유지가 기본 — 감정만으로 바꾸지 않음
  if (prevBg) return prevBg;
  // 첫 발화만 감정 힌트 (이후 sticky)
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
