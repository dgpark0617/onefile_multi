/** 컷톡 — Comic Chat 계승 웹채팅 (오리지널 아트·이름) */

export const EMOTIONS = [
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

export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_LABEL: Record<Emotion, string> = {
  neutral: '평온',
  happy: '기쁨',
  laugh: '폭소',
  angry: '화남',
  sad: '슬픔',
  surprise: '놀람',
  shy: '수줍',
  cool: '쿨',
  love: '설렘',
  think: '고민',
};

export const POSES = [
  'idle',
  'wave',
  'shrug',
  'fist',
  'facepalm',
  'heart',
  'point',
  'think',
  'cheer',
] as const;

export type Pose = (typeof POSES)[number];

export const POSE_LABEL: Record<Pose, string> = {
  idle: '기본',
  wave: '손흔들',
  shrug: '어깨으쓱',
  fist: '주먹',
  facepalm: '이마박',
  heart: '하트손',
  point: '가리키기',
  think: '턱괴기',
  cheer: '만세',
};

export const BACKGROUNDS = [
  'cafe',
  'park',
  'night',
  'office',
  'stage',
  'rain',
  'room',
] as const;

export type BgId = (typeof BACKGROUNDS)[number];

export const BG_LABEL: Record<BgId, string> = {
  cafe: '카페',
  park: '공원',
  night: '밤거리',
  office: '사무실',
  stage: '무대',
  rain: '비오는날',
  room: '방',
};

export const SHOTS = ['close', 'medium', 'wide', 'low', 'high'] as const;
export type Shot = (typeof SHOTS)[number];

export const SHOT_LABEL: Record<Shot, string> = {
  close: '클로즈업',
  medium: '미디엄',
  wide: '와이드',
  low: '로우앵글',
  high: '하이앵글',
};

export const HAIRS = ['none', 'bob', 'spike', 'ponytail', 'cap'] as const;
export type Hair = (typeof HAIRS)[number];

export const ACCESSORIES = ['none', 'glasses', 'scarf', 'star', 'bow'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const BODIES = ['round', 'tall', 'wide'] as const;
export type BodyShape = (typeof BODIES)[number];

export type CharLook = {
  hue: number;
  hair: Hair;
  accessory: Accessory;
  body: BodyShape;
  name: string;
};

export const DEFAULT_LOOK: CharLook = {
  hue: 210,
  hair: 'bob',
  accessory: 'none',
  body: 'round',
  name: '커스텀',
};

export const CHARACTERS = [
  { id: 'ink', name: '잉크', hue: 210, hair: 'none' as Hair, accessory: 'none' as Accessory, body: 'round' as BodyShape },
  { id: 'brush', name: '붓', hue: 28, hair: 'spike' as Hair, accessory: 'none' as Accessory, body: 'tall' as BodyShape },
  { id: 'dot', name: '점', hue: 320, hair: 'bob' as Hair, accessory: 'bow' as Accessory, body: 'round' as BodyShape },
  { id: 'frame', name: '칸', hue: 150, hair: 'cap' as Hair, accessory: 'glasses' as Accessory, body: 'wide' as BodyShape },
] as const;

export type PresetCharacterId = (typeof CHARACTERS)[number]['id'];
export type CharacterId = PresetCharacterId | 'custom';

export function lookFromPreset(id: PresetCharacterId): CharLook {
  const c = CHARACTERS.find((x) => x.id === id) ?? CHARACTERS[0];
  return {
    hue: c.hue,
    hair: c.hair,
    accessory: c.accessory,
    body: c.body,
    name: c.name,
  };
}

export type ComicMsg = {
  id: string;
  peerId: string;
  nick: string;
  characterId: CharacterId;
  look: CharLook;
  text: string;
  emotion: Emotion;
  pose: Pose;
  bg: BgId;
  shot: Shot;
  at: number;
};

export type WireMsg =
  | { type: 'hello'; peerId: string; nick: string; characterId: CharacterId; look: CharLook }
  | { type: 'msg'; payload: ComicMsg }
  | { type: 'sync'; messages: ComicMsg[] }
  | { type: 'ping' };

export const MAX_PANELS = 8;
export const PEER_PREFIX = 'cuttok-';
export const LOOK_STORAGE_KEY = 'cuttok-char-look-v1';
