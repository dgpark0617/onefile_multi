import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { buildRootMetadata, websiteJsonLd } from '@/lib/seo/metadata';
import { CUTTOK, SITE_NAME } from '@/lib/seo/site';
import './globals.css';

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <JsonLd data={websiteJsonLd()} />
        <header className="site-header">
          <Link href="/" className="brand">
            <strong>{CUTTOK.name}</strong>
            <span>
              {SITE_NAME} · 만화칸 실시간 채팅
            </span>
          </Link>
          <nav className="site-nav" aria-label="주요 메뉴">
            <Link href={CUTTOK.path}>시작</Link>
            <Link href={CUTTOK.aboutPath}>소개</Link>
            <Link href="/#games">게임</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>
            <Link href={CUTTOK.path}>{CUTTOK.name}</Link>
            {' · '}
            <Link href={CUTTOK.aboutPath}>소개·FAQ</Link>
            {' · '}
            <Link href="/llms.txt">llms.txt</Link>
          </p>
          <p>대화는 서버에 저장되지 않습니다. PeerJS P2P 만화칸 채팅.</p>
        </footer>
      </body>
    </html>
  );
}
