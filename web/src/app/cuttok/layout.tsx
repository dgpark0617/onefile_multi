import type { Metadata, Viewport } from 'next';
import './shell.css';

export const metadata: Metadata = {
  title: '컷톡 — CutTok',
  description: '만화칸 웹채팅 · Comic Chat 계승',
};

/** 키보드가 올라올 때 레이아웃이 줄어들도록 (지원 브라우저) */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/** 사이트 헤더/푸터 숨김 — 컷 높이 확보 */
export default function CutTokLayout({ children }: { children: React.ReactNode }) {
  return <div className="cc-shell">{children}</div>;
}
