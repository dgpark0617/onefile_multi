import type { CharLook, Emotion, Pose } from './types';
import {
  loadPackManifest,
  packFrameUrl,
  resolvePackFrameFile,
  seedBuiltinPacks,
} from './packRegistry';

export type ResolvedFrame = {
  src: string;
  flip: boolean;
  emotionBadge?: string;
};

const EMOTION_BADGE: Partial<Record<Emotion, string>> = {
  laugh: '😆',
  angry: '😠',
  sad: '😢',
  surprise: '😲',
  love: '❤️',
  think: '💭',
};

export async function resolveAvatarFrameAsync(
  look: CharLook,
  emotion: Emotion,
  pose: Pose,
  facing: 'left' | 'right',
): Promise<ResolvedFrame> {
  if (look.packId === 'photo' && look.photoUrl) {
    return {
      src: look.photoUrl,
      flip: facing === 'left',
      emotionBadge: EMOTION_BADGE[emotion],
    };
  }

  seedBuiltinPacks();
  const packId = look.packId || 'ink';
  const manifest = await loadPackManifest(packId);
  const file = manifest
    ? resolvePackFrameFile(manifest, emotion, pose)
    : pose !== 'idle'
      ? `${pose}.svg`
      : `${emotion}.svg`;

  return {
    src: packFrameUrl(packId, file),
    flip: facing === 'left' && (manifest?.flipForLeft ?? true),
  };
}
