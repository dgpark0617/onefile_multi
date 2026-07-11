import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { envStr } from './backend';
import { getSupabaseAdmin } from './supabaseAdmin';

export type AuthUser = {
  id: string;
  email: string | null;
  displayNameHint?: string;
};

function bearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

/** Access token 검증 → auth.uid (없으면 null) */
export async function verifyAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data.user) {
      const meta = data.user.user_metadata || {};
      return {
        id: data.user.id,
        email: data.user.email ?? null,
        displayNameHint:
          typeof meta.display_name === 'string'
            ? meta.display_name
            : typeof meta.displayName === 'string'
              ? meta.displayName
              : undefined,
      };
    }
  }

  // fallback: anon client
  const url = envStr('NEXT_PUBLIC_SUPABASE_URL');
  const anon = envStr('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anon) return null;
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const meta = data.user.user_metadata || {};
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayNameHint:
      typeof meta.display_name === 'string'
        ? meta.display_name
        : typeof meta.displayName === 'string'
          ? meta.displayName
          : undefined,
  };
}

export async function requireAuthUser(
  req: NextRequest,
): Promise<{ ok: true; user: AuthUser } | { ok: false; status: number; reason: string }> {
  if (!supabaseConfiguredForAuth()) {
    return { ok: false, status: 503, reason: 'AUTH_NOT_CONFIGURED' };
  }
  const user = await verifyAuthUser(req);
  if (!user) return { ok: false, status: 401, reason: 'UNAUTHORIZED' };
  return { ok: true, user };
}

function supabaseConfiguredForAuth(): boolean {
  return Boolean(envStr('NEXT_PUBLIC_SUPABASE_URL') && envStr('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}
