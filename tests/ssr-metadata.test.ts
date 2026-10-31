import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  stripChillySuffixes,
  unslugifyCity,
  slugify,
  getCleanSeoTitleSlug,
  buildChillyUrl,
} from '../lib/utils/seoAndUrlHelper';
import HomePage from '../app/page';
import CityPage, { generateMetadata as generateCityMetadata } from '../app/[city]/page';
import CategoryCityPage, { generateMetadata as generateCategoryMetadata } from '../app/[city]/[category]/page';
import ListingHierarchicalPage, {
  generateMetadata as generateListingMetadata,
} from '../app/[city]/[category]/[listingSlug]/page';
import FourSegmentListingPage, {
  generateMetadata as generateFourSegmentMetadata,
} from '../app/[city]/[category]/[listingSlug]/[itemSlug]/page';
import ItemDetailPage from '../app/item/[id]/page';
import SearchPage, { generateMetadata as generateSearchMetadata } from '../app/search/page';
import { listingRepository } from '../server/repositories/listing.repository';
import { categoryRepository } from '../server/repositories/category.repository';

describe('SSR & SEO Full Component HTML Rendering from PostgreSQL', () => {
  it('correctly parses Chillyads structured suffixes and canonical listing slugs', () => {
    const cityParsed = stripChillySuffixes('mumbai_g1');
    expect(cityParsed.cleanSlug).toBe('mumbai');
    expect(cityParsed.geoId).toBe('g1');

    const catParsed = stripChillySuffixes('cars_c2');
    expect(catParsed.cleanSlug).toBe('cars');
    expect(catParsed.categoryCode).toBe('c2');

    const itemParsed = stripChillySuffixes('used-honda-city-v-mt-iid-lst_1001');
    expect(itemParsed.cleanSlug).toBe('used-honda-city-v-mt');
    expect(itemParsed.itemId).toBe('lst_1001');

    const shortItemParsed = stripChillySuffixes('iphone-14-pro-lst_2041');
    expect(shortItemParsed.cleanSlug).toBe('iphone-14-pro');
    expect(shortItemParsed.itemId).toBe('lst_2041');

    expect(unslugifyCity('new-delhi').cityName).toBe('New Delhi');
    expect(unslugifyCity('mumbai').cityName).toBe('Mumbai');
    expect(slugify('Apple iPhone 15 Pro Max (256 GB)')).toBe('apple-iphone-15-pro-max-256-gb');
    expect(getCleanSeoTitleSlug('Apple iPhone 15 Pro Max (256 GB)')).toBe('iphone-15-pro');
  });

  it('generates dynamic SSR metadata for city, category, subcategory, search, and listing routes', async () => {
    const cityMeta = await generateCityMetadata({
      params: Promise.resolve({ city: 'mumbai_g1' }),
    });
    expect(String(cityMeta.title)).toContain('Mumbai');
    expect(String(cityMeta.description)).toContain('Mumbai');

    const catMeta = await generateCategoryMetadata({
      params: Promise.resolve({ city: 'mumbai_g1', category: 'cars_c2' }),
    });
    expect(String(catMeta.title)).toContain('Cars');
    expect(String(catMeta.title)).toContain('Mumbai');

    const searchMeta = await generateSearchMetadata({
      searchParams: Promise.resolve({ q: 'iphone', city: 'Mumbai' }),
    });
    expect(String(searchMeta.title)).toContain('iphone');
    expect(String(searchMeta.title)).toContain('Mumbai');

    const res = await listingRepository.findMarketplaceListings({ limit: 1 });
    expect(res.items.length).toBeGreaterThan(0);
    const listing = res.items[0];
    const categories = await categoryRepository.findAll();

    const canonicalUrl = buildChillyUrl({ listing, categories });
    const parts = canonicalUrl.split('/').filter(Boolean);
    expect(parts.length).toBe(4);

    const fourSegMeta = await generateFourSegmentMetadata({
      params: Promise.resolve({
        city: parts[0],
        category: parts[1],
        listingSlug: parts[2],
        itemSlug: parts[3],
      }),
    });
    expect(String(fourSegMeta.title)).toContain(listing.title);
  });

  it('server-renders complete real UI components and PostgreSQL data into initial HTML on Homepage, City, Category, Subcategory, Search, and Listing Detail routes', async () => {
    // 1. Homepage (/)
    const homeElement = await HomePage();
    const homeHtml = renderToStaticMarkup(homeElement);
    expect(homeHtml).toContain('<header');
    expect(homeHtml).toContain('<h1');
    expect(homeHtml).toContain('<footer');
    expect(homeHtml).toContain('₹');
    expect(homeHtml).not.toContain('sr-only');

    // 2. City Page (/mumbai)
    const cityElement = await CityPage({
      params: Promise.resolve({ city: 'mumbai' }),
    });
    const cityHtml = renderToStaticMarkup(cityElement);
    expect(cityHtml).toContain('Classified Ads in Mumbai');
    expect(cityHtml).toContain('aria-label="Breadcrumb"');
    expect(cityHtml).toContain('href="/mumbai/');
    expect(cityHtml).not.toContain('sr-only');

    // 3. Category Page (/mumbai/cars)
    const catElement = await CategoryCityPage({
      params: Promise.resolve({ city: 'mumbai', category: 'cars' }),
    });
    const catHtml = renderToStaticMarkup(catElement);
    expect(catHtml).toContain('Cars in Mumbai');
    expect(catHtml).toContain('aria-label="Breadcrumb"');
    expect(catHtml).toContain('<footer');
    expect(catHtml).not.toContain('sr-only');

    // 4. Subcategory Page (/mumbai/mobiles/mobile-phones)
    const subCatElement = await ListingHierarchicalPage({
      params: Promise.resolve({
        city: 'mumbai',
        category: 'mobiles',
        listingSlug: 'mobile-phones',
      }),
    });
    const subCatHtml = renderToStaticMarkup(subCatElement);
    expect(subCatHtml).toContain('Mobile Phones in Mumbai');
    expect(subCatHtml).toContain('aria-label="Breadcrumb"');

    // 5. Search Results Page (/search?q=iPhone)
    const searchElement = await SearchPage({
      searchParams: Promise.resolve({ q: 'iPhone' }),
    });
    const searchHtml = renderToStaticMarkup(searchElement);
    expect(searchHtml).toContain('Search Results for &quot;iPhone&quot;');
    expect(searchHtml).toContain('aria-label="Breadcrumb"');

    // 6. Listing Detail Pages (3-segment, 4-segment canonical, and /item/[id])
    const res = await listingRepository.findMarketplaceListings({ status: 'approved', limit: 1 });
    const listing = res.items[0];
    const categories = await categoryRepository.findAll();
    const canonicalPath = buildChillyUrl({ listing, categories });
    const segs = canonicalPath.split('/').filter(Boolean);

    const fourSegElement = await FourSegmentListingPage({
      params: Promise.resolve({
        city: segs[0],
        category: segs[1],
        listingSlug: segs[2],
        itemSlug: segs[3],
      }),
    });
    const fourSegHtml = renderToStaticMarkup(fourSegElement);
    expect(fourSegHtml).toContain(listing.title);
    expect(fourSegHtml).toContain(listing.sellerName);
    expect(fourSegHtml).toContain(`₹${listing.price.toLocaleString('en-IN')}`);
    expect(fourSegHtml).toContain('aria-label="Breadcrumb"');
    expect(fourSegHtml).toContain('<footer');
    expect(fourSegHtml).not.toContain('sr-only');

    const itemElement = await ItemDetailPage({
      params: Promise.resolve({ id: listing.id }),
    });
    const itemHtml = renderToStaticMarkup(itemElement);
    expect(itemHtml).toContain(listing.title);
    expect(itemHtml).toContain(listing.sellerName);
  });

  it('triggers Next.js HTTP 404 notFound() when a requested listing does not exist in PostgreSQL', async () => {
    let threwNotFound = false;
    try {
      await ItemDetailPage({
        params: Promise.resolve({ id: 'lst_nonexistent_99999999' }),
      });
    } catch (err: any) {
      if (err?.message?.includes('NEXT_HTTP_ERROR_FALLBACK;404') || err?.digest?.includes('404') || err?.message?.includes('notFound')) {
        threwNotFound = true;
      }
    }
    expect(threwNotFound).toBe(true);
  });
});
