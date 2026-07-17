import type { Emotion, Pose } from './types';
import {
  POSE_EMOTION_FALLBACK,
  resolveFrameKey,
  type FrameKey,
} from './frameGuide';

export type PackManifest = {
  id: string;
  name: string;
  version: number;
  /** 스프라이트 기본 방향 — 항상 right */
  facing: 'right';
  flipForLeft: boolean;
  /** photo 팩: 감정별 프레임 없음, 초상 1장 */
  kind: 'sprite' | 'photo';
  frames: Partial<Record<FrameKey, string>>;
  fallback: string;
};

/** 빌트인 팩 — public/cuttok/packs/{id}/pack.json 과 동기화 */
export const BUILTIN_PACK_IDS = ['ink', 'brush', 'dot', 'frame'] as const;
export type BuiltinPackId = (typeof BUILTIN_PACK_IDS)[number];

const manifests = new Map<string, PackManifest>();

export function registerPack(manifest: PackManifest): void {
  manifests.set(manifest.id, manifest);
}

/** SSR·클라이언트 공통 — 빌트인 메타 (실제 파일은 /cuttok/packs/) */
export function seedBuiltinPacks(): void {
  if (manifests.size > 0) return;
  for (const id of BUILTIN_PACK_IDS) {
    registerPack({
      id,
      name: id,
      version: 1,
      facing: 'right',
      flipForLeft: true,
      kind: 'sprite',
      fallback: 'idle.svg',
      frames: {},
    });
  }
}

export async function loadPackManifest(packId: string): Promise<PackManifest | null> {
  seedBuiltinPacks();
  const cached = manifests.get(packId);
  if (cached && cached.version > 0 && Object.keys(cached.frames).length > 0) {
    return cached;
  }
  if (typeof window === 'undefined' && packId !== 'photo') {
    return manifests.get(packId) ?? null;
  }
  try {
    const res = await fetch(`/cuttok/packs/${packId}/pack.json`, { cache: 'force-cache' });
    if (!res.ok) return manifests.get(packId) ?? null;
    const json = (await res.json()) as PackManifest;
    registerPack(json);
    return json;
  } catch {
    return manifests.get(packId) ?? null;
  }
}

export function resolvePackFrameFile(
  manifest: PackManifest,
  emotion: Emotion,
  pose: Pose,
): string {
  const key = resolveFrameKey(emotion, pose);
  if (manifest.frames[key]) return manifest.frames[key]!;
  if (pose !== 'idle') {
    const emo = POSE_EMOTION_FALLBACK[pose];
    if (emo && manifest.frames[emo]) return manifest.frames[emo]!;
  }
  if (manifest.frames[emotion]) return manifest.frames[emotion]!;
  return manifest.fallback;
}

export function packFrameUrl(packId: string, file: string): string {
  if (file.startsWith('http') || file.startsWith('data:') || file.startsWith('blob:')) {
    return file;
  }
  return `/cuttok/packs/${packId}/${file}`;
}
