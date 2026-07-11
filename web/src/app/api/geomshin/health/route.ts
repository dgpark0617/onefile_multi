import { NextResponse } from 'next/server';
import { checkGeomShinTables, useSupabaseStore } from '@/lib/geomshin/persist';
import { getStoreBackend, supabaseConfigured } from '@/lib/geomshin/backend';

/** 배포/연결 상태 확인 */
export async function GET() {
  const backend = getStoreBackend();
  const configured = supabaseConfigured();
  if (!useSupabaseStore()) {
    return NextResponse.json({
      ok: true,
      backend,
      configured,
      tables: 'n/a (memory)',
    });
  }
  const tables = await checkGeomShinTables();
  return NextResponse.json({
    ok: tables.ok,
    backend,
    configured,
    tables: tables.detail,
    hint: tables.ok
      ? undefined
      : 'Supabase SQL Editor에서 src/lib/geomshin/supabase-schema.sql 전체 실행',
  });
}
