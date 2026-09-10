import type { MetadataRoute } from 'next';
import { person } from '@/lib/content';

/* NOTE: the live robots.txt is currently being served by Cloudflare's "managed
   robots.txt", which appends its own block disallowing GPTBot, ClaudeBot,
   Google-Extended, CCBot and others. This file cannot override that — the
   managed block is a toggle in the Cloudflare dashboard (Security → Settings →
   Manage robots.txt). What this file does guarantee is that the origin's own
   rules stay permissive and that the sitemap is declared. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${person.site}/sitemap.xml`,
    host: person.site,
  };
}
