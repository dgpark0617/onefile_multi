import type { Metadata } from 'next';
import { TERMS } from '@/lib/geomshin/terms';
import './geomshin.css';
import GeomShinApp from './GeomShinApp';

export const metadata: Metadata = {
  title: `${TERMS.brand} — ${TERMS.brandEn}`,
  description: TERMS.platformBlurb,
};

export default function GeomShinPage() {
  return <GeomShinApp />;
}
