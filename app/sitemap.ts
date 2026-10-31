import { MetadataRoute } from 'next';
import { listingService } from '@/server/services/listing.service';
import { adminService } from '@/server/services/admin.service';
import { slugify, buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://chillyads.com';
  const now = new Date();

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

  const [allLocations, allCategories, { items: listings }] = await Promise.all([
    adminService.getLocations(),
    adminService.getCategories(),
    listingService.getMarketplaceListings({ limit: 200 }),
  ]);

  // Dynamic city routes
  const cities = allLocations.filter((l) => l.type === 'city' && l.isActive);
  const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${baseUrl}/${slugify(city.name)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  // Dynamic category & subcategory routes
  const rootCategories = allCategories.filter((c) => c.parentId === null && c.isActive);
  const categoryRoutes: MetadataRoute.Sitemap = rootCategories.map((cat) => ({
    url: `${baseUrl}/${cat.slug || slugify(cat.name)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  const subcategories = allCategories.filter((c) => c.parentId !== null && c.isActive);
  const subcategoryRoutes: MetadataRoute.Sitemap = subcategories.map((sub) => {
    const parent = allCategories.find((p) => p.id === sub.parentId);
    const parentSlug = parent ? parent.slug || slugify(parent.name) : 'classifieds';
    const subSlug = sub.slug || slugify(sub.name);
    return {
      url: `${baseUrl}/${parentSlug}/${subSlug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    };
  });

  // Approved listings with canonical hierarchical URLs
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${baseUrl}${buildChillyUrl({ listing: l, categories: allCategories })}`,
    lastModified: new Date(l.createdAt || now),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [
    ...staticRoutes,
    ...cityRoutes,
    ...categoryRoutes,
    ...subcategoryRoutes,
    ...listingRoutes,
  ];
}
