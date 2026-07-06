import gamesData from '@/data/games.json';

export type GameCategory =
  | 'sports'
  | 'action'
  | 'roguelike'
  | 'arcade'
  | 'education'
  | 'racing';

export interface GameEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: GameCategory;
  tags: string[];
  source: string;
  downloadName: string;
  featured?: boolean;
}

export const GAMES: GameEntry[] = gamesData as GameEntry[];

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  sports: '스포츠',
  action: '액션',
  roguelike: '로그라이크',
  arcade: '아케이드',
  education: '학습',
  racing: '레이싱',
};

export function getGameBySlug(slug: string): GameEntry | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function getAllSlugs(): string[] {
  return GAMES.map((g) => g.slug);
}

export function playUrl(slug: string): string {
  return `/games/${slug}/index.html`;
}

export function downloadUrl(slug: string, downloadName: string): string {
  return `/games/${slug}/${downloadName}`;
}
