import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/my-account/', '/api/'],
      },
    ],
    sitemap: 'https://chillyads.com/sitemap.xml',
  };
}
