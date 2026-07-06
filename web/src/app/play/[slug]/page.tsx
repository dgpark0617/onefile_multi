import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CATEGORY_LABELS,
  downloadUrl,
  getAllSlugs,
  getGameBySlug,
  playUrl,
} from '@/lib/games';

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return { title: '게임 없음' };
  return {
    title: `${game.title} — Amurtaht Games`,
    description: game.subtitle,
  };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  const src = playUrl(slug);
  const dl = downloadUrl(slug, game.downloadName);

  return (
    <div className="container">
      <div className="game-page-header">
        <div>
          <p className="tag" style={{ display: 'inline-block', marginBottom: 8 }}>
            {CATEGORY_LABELS[game.category]}
          </p>
          <h1>{game.title}</h1>
          <p>{game.subtitle}</p>
        </div>
        <div className="card-actions">
          <a href={dl} download={game.downloadName} className="btn btn-primary">
            HTML 다운로드
          </a>
          <Link href="/" className="btn btn-ghost">
            ← 목록
          </Link>
        </div>
      </div>

      <div className="game-frame-wrap">
        <iframe
          className="game-frame"
          src={src}
          title={game.title}
          allow="fullscreen"
          loading="eager"
        />
      </div>

      <div className="note-box">
        <strong>오프라인 실행:</strong> 위의「HTML 다운로드」로 받은 파일을 브라우저에서
        열면 됩니다. 멀티 게임은 PeerJS 연결이 필요할 수 있습니다.
        <br />
        원본 경로: <code>{game.source}</code>
      </div>
    </div>
  );
}
