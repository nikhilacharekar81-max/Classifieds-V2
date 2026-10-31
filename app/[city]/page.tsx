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
      {/* Interactive Marketplace Interface */}
      <AppClientRouter initialPath={`/${city}`} />

      {/* Visible Server-Rendered HTML from PostgreSQL */}
      <section
        className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8"
        aria-label={`Marketplace directory for ${cityName}`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Classifieds in {cityName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Browse top verified listings across {categories.length} categories in {cityName}.
              Direct seller contact, zero commissions, and instant community chat.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Featured Ads in {cityName}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {listingsData.items.map((item) => (
                <li
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
                >
                  <Link
                    href={`/${city}/${item.categoryId}/${item.id}`}
                    className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600"
                  >
                    {item.title} — ₹{item.price.toLocaleString('en-IN')} in {item.location.locality}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.description.slice(0, 120)}...
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
