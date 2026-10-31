import type { Metadata } from 'next';
import { locationRepository } from '@/server/repositories/location.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { AppClientRouter } from '@/components/AppClientRouter';
import Link from 'next/link';

import { stripChillySuffixes, unslugifyCity } from '@/lib/utils/seoAndUrlHelper';

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const { cleanSlug } = stripChillySuffixes(city);
  const loc = (await locationRepository.findBySlug(cleanSlug)) || (await locationRepository.findBySlug(city));
  const cityName = loc ? loc.name : unslugifyCity(city).cityName;

  const title = `Classified Ads in ${cityName} — Free Buy, Sell, Jobs & Services`;
  const description = `Browse free local classified ads in ${cityName}. Find second-hand cars, bikes, mobile phones, apartments for rent, electronics, jobs and services in ${cityName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/${city}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const { cleanSlug } = stripChillySuffixes(city);
  const loc = (await locationRepository.findBySlug(cleanSlug)) || (await locationRepository.findBySlug(city));
  const cityName = loc ? loc.name : unslugifyCity(city).cityName;

  // Fetch actual PostgreSQL listings and categories for genuine database-backed SSR
  const [listingsData, categories] = await Promise.all([
    listingRepository.findMarketplaceListings({ city, limit: 12 }),
    categoryRepository.findAll(),
  ]);

  return (
    <>
      {/* Semantic Server-Rendered HTML for Crawlers & Initial Paint */}
      <section className="sr-only" aria-label={`Marketplace directory for ${cityName}`}>
        <h1>Classifieds in {cityName}</h1>
        <p>
          Browse top verified listings across {categories.length} categories in {cityName}.
          Direct seller contact, zero commissions, and instant community chat.
        </p>
        <div>
          <h2>Featured Ads in {cityName}</h2>
          <ul>
            {listingsData.items.map((item) => (
              <li key={item.id}>
                <Link href={`/${city}/${item.categoryId}/${item.id}`}>
                  {item.title} — ₹{item.price.toLocaleString('en-IN')} in {item.location.locality}
                </Link>
                <p>{item.description.slice(0, 120)}...</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Interactive Marketplace Interface */}
      <AppClientRouter />
    </>
  );
}
