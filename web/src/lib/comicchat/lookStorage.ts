import {
  DEFAULT_LOOK,
  LOOK_STORAGE_KEY,
  type CharLook,
  type Hair,
  type Accessory,
  type BodyShape,
} from './types';

function isHair(v: unknown): v is Hair {
  return v === 'none' || v === 'bob' || v === 'spike' || v === 'ponytail' || v === 'cap';
}
function isAccessory(v: unknown): v is Accessory {
  return (
    v === 'none' ||
    v === 'glasses' ||
    v === 'scarf' ||
    v === 'star' ||
    v === 'bow'
  );
}
function isBody(v: unknown): v is BodyShape {
  return v === 'round' || v === 'tall' || v === 'wide';
}

export function loadSavedLook(): CharLook | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CharLook>;
    return normalizeLook(parsed);
  } catch {
    return null;
  }
}

export function saveLook(look: CharLook): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(normalizeLook(look)));
}

export function normalizeLook(partial: Partial<CharLook> | null | undefined): CharLook {
  const base = { ...DEFAULT_LOOK, ...(partial || {}) };
  return {
    hue: Number.isFinite(base.hue) ? Math.max(0, Math.min(360, Math.round(base.hue))) : 210,
    hair: isHair(base.hair) ? base.hair : 'bob',
    accessory: isAccessory(base.accessory) ? base.accessory : 'none',
    body: isBody(base.body) ? base.body : 'round',
    name: String(base.name || '커스텀').slice(0, 8),
  };
}
