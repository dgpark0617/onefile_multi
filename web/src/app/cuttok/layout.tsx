import type { Metadata, Viewport } from 'next';
import { buildCutTokMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildCutTokMetadata();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/** 메타만 공유 — 앱 셸은 /cuttok 본문에만 적용 (소개 페이지는 사이트 크롬 유지) */
export default function CutTokSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
