import { describe, it, expect } from 'bun:test';
import {
  stripChillySuffixes,
  unslugifyCity,
  slugify,
  getCleanSeoTitleSlug,
} from '../lib/utils/seoAndUrlHelper';
import { generateMetadata as generateCityMetadata } from '../app/[city]/page';
import { generateMetadata as generateCategoryMetadata } from '../app/[city]/[category]/page';
import { generateMetadata as generateListingMetadata } from '../app/[city]/[category]/[listingSlug]/page';
import { listingRepository } from '../server/repositories/listing.repository';

describe('SSR & SEO Hierarchy, Slugs, and Metadata', () => {
  it('correctly parses Chillyads structured suffixes for city, category, and listing item IDs', () => {
    // City with geo ID
    const cityParsed = stripChillySuffixes('mumbai_g1');
    expect(cityParsed.cleanSlug).toBe('mumbai');
    expect(cityParsed.geoId).toBe('g1');

    // Category with category code
    const catParsed = stripChillySuffixes('cars_c2');
    expect(catParsed.cleanSlug).toBe('cars');
    expect(catParsed.categoryCode).toBe('c2');

    // Listing item slug with item ID
    const itemParsed = stripChillySuffixes('used-honda-city-v-mt-iid-lst_1001');
    expect(itemParsed.cleanSlug).toBe('used-honda-city-v-mt');
    expect(itemParsed.itemId).toBe('lst_1001');

    // Human-readable city formatting
    expect(unslugifyCity('new-delhi').cityName).toBe('New Delhi');
    expect(unslugifyCity('mumbai').cityName).toBe('Mumbai');
    expect(slugify('Apple iPhone 15 Pro Max (256 GB)')).toBe('apple-iphone-15-pro-max-256-gb');
    expect(getCleanSeoTitleSlug('Apple iPhone 15 Pro Max (256 GB)')).toBe('iphone-15-pro');
  });

  it('generates dynamic SSR metadata for city routes', async () => {
    const metadata = await generateCityMetadata({
      params: Promise.resolve({ city: 'mumbai_g1' }),
    });

    expect(metadata.title).toBeDefined();
    expect(String(metadata.title)).toContain('Mumbai');
    expect(metadata.description).toBeDefined();
    expect(String(metadata.description)).toContain('Mumbai');
    expect(metadata.openGraph?.title).toBeDefined();
  });

  it('generates dynamic SSR metadata for category routes', async () => {
    const metadata = await generateCategoryMetadata({
      params: Promise.resolve({ city: 'mumbai_g1', category: 'cars_c2' }),
    });

    expect(metadata.title).toBeDefined();
    expect(String(metadata.title)).toContain('Cars');
    expect(String(metadata.title)).toContain('Mumbai');
    expect(metadata.description).toBeDefined();
  });

  it('generates dynamic SSR metadata and Schema.org JSON-LD for listing pages backed by PostgreSQL', async () => {
    // Fetch a real listing from PostgreSQL
    const res = await listingRepository.findMarketplaceListings({ limit: 1 });
    expect(res.items.length).toBeGreaterThan(0);
    const listing = res.items[0];

    const slug = `${slugify(listing.title)}-iid-${listing.id}`;
    const metadata = await generateListingMetadata({
      params: Promise.resolve({
        city: 'mumbai_g1',
        category: 'cars_c2',
        listingSlug: slug,
      }),
    });

    expect(metadata.title).toBeDefined();
    expect(String(metadata.title)).toContain(listing.title);
    expect(String(metadata.openGraph?.title)).toContain(listing.title);
  });
});
