import type { Metadata } from 'next';
import { locationRepository } from '@/server/repositories/location.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { AppClientRouter } from '@/components/AppClientRouter';
import Link from 'next/link';

import { stripChillySuffixes, unslugifyCity } from '@/lib/utils/seoAndUrlHelper';

interface CategoryCityPageProps {
  params: Promise<{ city: string; category: string }>;
}

export async function generateMetadata({ params }: CategoryCityPageProps): Promise<Metadata> {
  const { city, category } = await params;
  const { cleanSlug: cleanCitySlug } = stripChillySuffixes(city);
  const loc = (await locationRepository.findBySlug(cleanCitySlug)) || (await locationRepository.findBySlug(city));
  const cityName = loc ? loc.name : unslugifyCity(city).cityName;

  const { cleanSlug: cleanCatSlug } = stripChillySuffixes(category);
  const cat = (await categoryRepository.findBySlug(cleanCatSlug)) || (await categoryRepository.findBySlug(category));
  const categoryName = cat ? cat.name : cleanCatSlug.charAt(0).toUpperCase() + cleanCatSlug.slice(1);

  const title = `${categoryName} in ${cityName} — Buy, Sell & Best Deals | Classifieds V2`;
  const description = `Explore ${categoryName} for sale and services in ${cityName}. Compare prices, inspect photos, and chat with verified sellers directly.`;

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
      canonical: `/${city}/${category}`,
    },
  };
}

export default async function CategoryCityPage({ params }: CategoryCityPageProps) {
  const { city, category } = await params;
  const { cleanSlug: cleanCitySlug } = stripChillySuffixes(city);
  const loc = (await locationRepository.findBySlug(cleanCitySlug)) || (await locationRepository.findBySlug(city));
  const cityName = loc ? loc.name : unslugifyCity(city).cityName;

  const { cleanSlug: cleanCatSlug } = stripChillySuffixes(category);
  const cat = (await categoryRepository.findBySlug(cleanCatSlug)) || (await categoryRepository.findBySlug(category));
  const categoryName = cat ? cat.name : cleanCatSlug.charAt(0).toUpperCase() + cleanCatSlug.slice(1);
  const categoryId = cat ? cat.id : cleanCatSlug;

  // Genuine PostgreSQL SSR query
  const listingsData = await listingRepository.findMarketplaceListings({
    city,
    category: categoryId,
    limit: 20,
  });

  return (
    <>
      <AppClientRouter initialPath={`/${city}/${category}`} />

      <section
        className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8"
        aria-label={`${categoryName} listings in ${cityName}`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {categoryName} in {cityName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Showing {listingsData.total} verified classified ads for {categoryName} in {cityName}.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listingsData.items.map((item) => (
              <li
                key={item.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
              >
                <Link
                  href={`/${city}/${category}/${item.id}`}
                  className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600"
                >
                  {item.title} — ₹{item.price.toLocaleString('en-IN')}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {item.description.slice(0, 100)}...
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
