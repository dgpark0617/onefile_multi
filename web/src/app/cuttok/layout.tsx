import type { Metadata } from 'next';
import './shell.css';

export const metadata: Metadata = {
  title: '컷톡 — CutTok',
  description: '만화칸 웹채팅 · Comic Chat 계승',
};

/** 사이트 헤더/푸터 숨김 — 컷 높이 확보 */
export default function CutTokLayout({ children }: { children: React.ReactNode }) {
  return <div className="cc-shell">{children}</div>;
}
