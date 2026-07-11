/** 검신 — 표시 닉네임 + Auth 세션 보조 캐시 */

export const GEOM_UID_KEY = 'geomshin_uid';
export const GEOM_NAME_KEY = 'geomshin_display';

const NICK_RE = /^[\w가-힣.\-]{2,20}$/u;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePlayerId(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

/** 화면용 닉네임 (소유권 아님) */
export function validateDisplayName(
  raw: string,
): { ok: true; id: string } | { ok: false; reason: string } {
  const id = normalizePlayerId(raw);
  if (id.length < 2) return { ok: false, reason: '닉네임은 2자 이상' };
  if (id.length > 20) return { ok: false, reason: '닉네임은 20자 이하' };
  if (!NICK_RE.test(id)) return { ok: false, reason: '한글·영문·숫자·_ . - 만 사용' };
  if (/^(guest|admin|null|undefined)$/i.test(id)) {
    return { ok: false, reason: '사용할 수 없는 닉네임' };
  }
  return { ok: true, id };
}

/** @deprecated 소유권은 Auth uid — 닉네임 검증용으로만 유지 */
export function validatePlayerId(raw: string) {
  return validateDisplayName(raw);
}

export function isAuthUserId(id: string): boolean {
  return UUID_RE.test(id);
}

export function readStoredSession(): { id: string; displayName: string } | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(GEOM_UID_KEY);
  if (!id || !isAuthUserId(id)) return null;
  const displayName = localStorage.getItem(GEOM_NAME_KEY) || id.slice(0, 8);
  return { id, displayName };
}

export function writeStoredSession(id: string, displayName?: string) {
  localStorage.setItem(GEOM_UID_KEY, id);
  localStorage.setItem(GEOM_NAME_KEY, displayName || id.slice(0, 8));
}

export function clearStoredSession() {
  localStorage.removeItem(GEOM_UID_KEY);
  localStorage.removeItem(GEOM_NAME_KEY);
  localStorage.removeItem('geomshin_home');
}

export function encodeUserIdHeader(id: string): string {
  return encodeURIComponent(id);
}

export function decodeUserIdHeader(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
