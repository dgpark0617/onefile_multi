import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Amurtaht Games',
  description: '브라우저 원파일 HTML 게임 플레이 & 다운로드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <strong>Amurtaht Games</strong>
            <span>플레이 · 다운로드 · 원파일 HTML</span>
          </Link>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          각 게임은 단일 HTML 파일로 오프라인에서도 실행할 수 있습니다.
        </footer>
      </body>
    </html>
  );
}
