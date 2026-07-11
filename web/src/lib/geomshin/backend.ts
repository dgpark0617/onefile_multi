/**
 * 검신 저장소 어댑터 자리 (Supabase 연결 준비)
 * - 지금: memory (process global)
 * - 배포 멀티: Supabase (schema: supabase-schema.sql)
 */
export type StoreBackend = 'memory' | 'supabase';

export function getStoreBackend(): StoreBackend {
  if (process.env.GEOMSHIN_USE_SUPABASE === 'true' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return 'supabase';
  }
  return 'memory';
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
