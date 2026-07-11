/**
 * 검신 저장소 어댑터
 * - memory: process global (로컬/테스트)
 * - supabase: 배포 멀티플레이
 */
export type StoreBackend = 'memory' | 'supabase';

function envFlag(name: string): boolean {
  const raw = process.env[name];
  if (!raw) return false;
  const v = raw.trim().replace(/^["']|["']$/g, '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envStr(name: string): string {
  const raw = process.env[name];
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function getStoreBackend(): StoreBackend {
  if (envFlag('GEOMSHIN_USE_SUPABASE') && envStr('NEXT_PUBLIC_SUPABASE_URL')) {
    return 'supabase';
  }
  return 'memory';
}

export function supabaseConfigured(): boolean {
  return Boolean(envStr('NEXT_PUBLIC_SUPABASE_URL') && envStr('SUPABASE_SERVICE_ROLE_KEY'));
}

export { envStr };
