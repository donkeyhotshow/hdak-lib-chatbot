import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hdak-lib-chatbot.vercel.app';
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${baseUrl}/мапа_сайту.xml`,
  };
}
