import type { NextRequest } from 'next/server';
import { decodeUserIdHeader } from '@/lib/geomshin/session';

/** body / header / query 에서 userId 추출 (한글 헤더는 decode) */
export function readUserId(
  req: NextRequest,
  body?: { userId?: string } | null,
): string {
  const fromBody = body?.userId ? String(body.userId) : '';
  const fromHeader = decodeUserIdHeader(req.headers.get('x-user-id'));
  const fromQuery = decodeUserIdHeader(req.nextUrl.searchParams.get('userId'));
  return fromBody || fromHeader || fromQuery || 'guest';
}
