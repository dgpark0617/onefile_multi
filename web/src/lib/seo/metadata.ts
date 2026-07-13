import type { Metadata } from 'next';
import { CUTTOK, CUTTOK_FAQ, getSiteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site';

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildRootMetadata(): Metadata {
  const site = getSiteUrl();
  return {
    metadataBase: new URL(site),
    title: {
      default: `${CUTTOK.name} · ${SITE_NAME}`,
      template: `%s · ${SITE_NAME}`,
    },
    description: CUTTOK.shortDescription,
    applicationName: CUTTOK.name,
    keywords: [...CUTTOK.keywords],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      url: site,
      siteName: `${SITE_NAME} — ${SITE_TAGLINE}`,
      title: CUTTOK.title,
      description: CUTTOK.shortDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: CUTTOK.title,
      description: CUTTOK.shortDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    category: 'communication',
  };
}

export function buildCutTokMetadata(): Metadata {
  return {
    title: { absolute: CUTTOK.title },
    description: CUTTOK.longDescription,
    keywords: [...CUTTOK.keywords],
    alternates: {
      canonical: CUTTOK.path,
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      url: absoluteUrl(CUTTOK.path),
      siteName: SITE_NAME,
      title: CUTTOK.title,
      description: CUTTOK.shortDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: CUTTOK.title,
      description: CUTTOK.shortDescription,
    },
  };
}

export function buildCutTokAboutMetadata(): Metadata {
  return {
    title: '컷톡 소개 · 사용법 · FAQ',
    description:
      '컷톡(CutTok)이 무엇인지, 방 입장 방법, 대화 저장 여부, Comic Chat과의 관계까지 FAQ로 정리했습니다.',
    keywords: [...CUTTOK.keywords, 'FAQ', '사용법', '소개'],
    alternates: {
      canonical: CUTTOK.aboutPath,
    },
    openGraph: {
      type: 'article',
      locale: 'ko_KR',
      url: absoluteUrl(CUTTOK.aboutPath),
      siteName: SITE_NAME,
      title: '컷톡 소개 · 사용법 · FAQ',
      description: CUTTOK.shortDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: '컷톡 소개 · 사용법 · FAQ',
      description: CUTTOK.shortDescription,
    },
  };
}

export function websiteJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['컷톡', 'CutTok', 'Amurtaht Games'],
    url,
    description: CUTTOK.shortDescription,
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url,
    },
    mainEntity: {
      '@type': 'WebApplication',
      name: CUTTOK.name,
      alternateName: CUTTOK.nameEn,
      url: absoluteUrl(CUTTOK.path),
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript and WebRTC',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
      },
      description: CUTTOK.longDescription,
    },
  };
}

export function cutTokAppJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: CUTTOK.name,
    alternateName: CUTTOK.nameEn,
    url: absoluteUrl(CUTTOK.path),
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript and WebRTC',
    inLanguage: 'ko-KR',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    description: CUTTOK.longDescription,
    featureList: [
      '만화칸·말풍선 채팅',
      '감정·포즈 연출',
      '방 코드·QR 초대',
      'PeerJS P2P',
      '대화 비저장',
    ],
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}

export function cutTokFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CUTTOK_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
