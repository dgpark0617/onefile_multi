import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/** Next는 process.env.NEXT_PUBLIC_* 정적 접근만 클라이언트에 인라인한다. */
function stripEnv(v: string | undefined): string {
  return (v || '').trim().replace(/^["']|["']$/g, '');
}

function publicSupabaseConfig(): { url: string; anon: string } {
  return {
    url: stripEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: stripEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/** 브라우저 Auth용 (anon key) */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  const { url, anon } = publicSupabaseConfig();
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
  const { url, anon } = publicSupabaseConfig();
  return Boolean(url && anon);
}
