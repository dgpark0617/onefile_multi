'use client';

type Props = {
  slug: string;
  join?: string;
  title: string;
};

export function PlayFrame({ slug, join, title }: Props) {
  const qs = join ? `?join=${encodeURIComponent(join)}` : '';
  const src = `/games/${slug}/index.html${qs}`;

  return (
    <iframe
      className="game-frame"
      src={src}
      title={title}
      allow="fullscreen"
      loading="eager"
    />
  );
}
