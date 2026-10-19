import type { MetadataRoute } from 'next';
import { PRODUCTS, GRADE_CATEGORIES } from './data/products';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://moribox.example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const gradeUrls: MetadataRoute.Sitemap = GRADE_CATEGORIES.map((c) => ({
    url: `${SITE_URL}/danh-muc/${c.id.slice(6).toLowerCase()}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productUrls: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${SITE_URL}/san-pham/${p.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/flash-sale`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/hang-moi-ve`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/hang-ban-chay`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...gradeUrls,
    ...productUrls,
  ];
}
