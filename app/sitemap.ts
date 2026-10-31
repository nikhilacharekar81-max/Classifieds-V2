import { MetadataRoute } from 'next';
import { listingService } from '@/server/services/listing.service';
import { adminService } from '@/server/services/admin.service';
import { slugify, getCityGeoId } from '@/lib/utils/seoAndUrlHelper';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://chillyads.com';
  const now = new Date();

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/post`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dynamic city routes
  const locations = adminService.getLocations().filter((l) => l.type === 'city');
  const cityRoutes: MetadataRoute.Sitemap = locations.map((city) => {
    const citySlug = slugify(city.name);
    const geoId = getCityGeoId(city.name);
    return {
      url: `${baseUrl}/${citySlug}_${geoId}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    };
  });

  // Dynamic category routes
  const categories = adminService.getCategories().filter((c) => c.parentId === null);
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/all-india/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Approved listings
  const { items: listings } = listingService.getMarketplaceListings({ limit: 100 });
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${baseUrl}/item/${l.id}`,
    lastModified: new Date(l.createdAt || now),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...cityRoutes, ...categoryRoutes, ...listingRoutes];
}
