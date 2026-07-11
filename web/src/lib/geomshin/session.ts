/** 검신 — 아이디 세션 (비밀번호 없음, 로컬 기억) */

export const GEOM_UID_KEY = 'geomshin_uid';
export const GEOM_NAME_KEY = 'geomshin_display';

/** 허용: 한글·영문·숫자·_ . - , 2~20자 */
const ID_RE = /^[\w가-힣.\-]{2,20}$/u;

export function normalizePlayerId(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

export function validatePlayerId(raw: string): { ok: true; id: string } | { ok: false; reason: string } {
  const id = normalizePlayerId(raw);
  if (id.length < 2) return { ok: false, reason: '아이디는 2자 이상' };
  if (id.length > 20) return { ok: false, reason: '아이디는 20자 이하' };
  if (!ID_RE.test(id)) return { ok: false, reason: '한글·영문·숫자·_ . - 만 사용' };
  if (/^(guest|admin|null|undefined)$/i.test(id)) {
    return { ok: false, reason: '사용할 수 없는 아이디' };
  }
  return { ok: true, id };
}

export function readStoredSession(): { id: string; displayName: string } | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(GEOM_UID_KEY);
  if (!id) return null;
  const v = validatePlayerId(id);
  if (!v.ok) return null;
  // 예전 자동발급 u_xxxx 는 입장 화면으로 유도
  if (/^u_[a-z0-9]{6,}$/i.test(v.id)) return null;
  const displayName = localStorage.getItem(GEOM_NAME_KEY) || v.id;
  return { id: v.id, displayName };
}

export function writeStoredSession(id: string, displayName?: string) {
  localStorage.setItem(GEOM_UID_KEY, id);
  localStorage.setItem(GEOM_NAME_KEY, displayName || id);
}

export function clearStoredSession() {
  localStorage.removeItem(GEOM_UID_KEY);
  localStorage.removeItem(GEOM_NAME_KEY);
  localStorage.removeItem('geomshin_home');
}
