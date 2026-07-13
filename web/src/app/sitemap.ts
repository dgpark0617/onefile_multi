import type { MetadataRoute } from 'next';
import { GAMES } from '@/lib/games';
import { CUTTOK, getSiteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    {
      url: site,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${site}${CUTTOK.path}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${site}${CUTTOK.aboutPath}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${site}/geomshin`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${site}/geomshin/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  const games: MetadataRoute.Sitemap = GAMES.map((g) => ({
    url: `${site}/play/${g.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [...core, ...games];
}
