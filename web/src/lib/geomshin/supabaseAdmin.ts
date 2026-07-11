import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envStr, supabaseConfigured } from './backend';

let admin: SupabaseClient | null = null;

/** 서버 전용 — service_role. 클라에 노출 금지. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (admin) return admin;
  const url = envStr('NEXT_PUBLIC_SUPABASE_URL');
  const key = envStr('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
