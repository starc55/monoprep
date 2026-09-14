import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || 'https://monoprep.vercel.app').replace(/\/$/, '');
const publicDir = resolve(process.cwd(), 'public');

const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /exam-room\nDisallow: /analytics\nDisallow: /account\nDisallow: /settings\nDisallow: /auth/\nDisallow: /reset-password\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
const urls = ['/', '/products', '/legal/terms', '/legal/privacy'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
  .join('\n')}\n</urlset>\n`;

await Promise.all([
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8')
]);
