import type { MetadataRoute } from 'next';
import { person } from '@/lib/content';

/* One page, one entry — but a declared sitemap is what lets a crawler confirm
   the canonical host rather than infer it from whichever variant it reached. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: person.site,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
