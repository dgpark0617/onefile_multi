import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function publicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const v = process.env[name] || '';
  return v.trim().replace(/^["']|["']$/g, '');
}

/** 브라우저 Auth용 (anon key) */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = publicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anon) {
    throw new Error('Supabase 공개 키가 없습니다 (.env.local / Vercel env)');
  }
  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

export function isSupabaseBrowserReady(): boolean {
  return Boolean(publicEnv('NEXT_PUBLIC_SUPABASE_URL') && publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}
