import type { Metadata } from 'next';
import { TERMS } from '@/lib/geomshin/terms';
import './geomshin.css';
import GeomShinApp from './GeomShinApp';

/** 검신 맵 엔트리 — 기획 의도: `@/lib/geomshin/roadmap` 상단 주석 */

export const metadata: Metadata = {
  title: `${TERMS.brand} — ${TERMS.brandEn}`,
  description: TERMS.platformBlurb,
};

export const dynamic = 'force-dynamic';

export default function GeomShinPage() {
  return <GeomShinApp />;
}
