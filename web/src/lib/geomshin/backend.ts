/**
 * 검신 저장소 어댑터
 * - memory: process global (로컬/테스트)
 * - supabase: 배포 멀티플레이
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
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
