import type { NextRequest } from 'next/server';
import { requireAuthUser, type AuthUser } from './supabaseAuth';

/**
 * API 진입: Bearer 토큰 필수.
 * body.userId 는 무시(위조 방지) — 항상 auth.uid 사용.
 */
export async function requireApiUser(
  req: NextRequest,
): Promise<{ ok: true; user: AuthUser } | { ok: false; status: number; reason: string }> {
  return requireAuthUser(req);
}

/** @deprecated 인증 없는 userId 추출 — 사용 금지 */
export function readUserId(): string {
  return 'guest';
}
