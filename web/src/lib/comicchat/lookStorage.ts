import {
  DEFAULT_LOOK,
  LOOK_STORAGE_KEY,
  PHOTO_STORAGE_KEY,
  type CharLook,
} from './types';

export function loadSavedLook(): CharLook | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CharLook>;
    if (parsed.packId === 'photo') {
      parsed.photoUrl = loadSavedPhoto() || parsed.photoUrl;
    }
    return normalizeLook(parsed);
  } catch {
    return null;
  }
}

export function loadSavedPhoto(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PHOTO_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLook(look: CharLook): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLook(look);
  const { photoUrl, ...meta } = normalized;
  localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(meta));
  if (photoUrl) {
    localStorage.setItem(PHOTO_STORAGE_KEY, photoUrl);
  } else {
    localStorage.removeItem(PHOTO_STORAGE_KEY);
  }
}

export function normalizeLook(partial: Partial<CharLook> | null | undefined): CharLook {
  const base = { ...DEFAULT_LOOK, ...(partial || {}) };
  const packId = base.packId || 'ink';
  const photoUrl = base.photoUrl;

  return {
    packId: packId === 'photo' || photoUrl ? 'photo' : packId,
    name: String(base.name || '커스텀').slice(0, 8),
    ...(photoUrl ? { photoUrl } : {}),
  };
}
