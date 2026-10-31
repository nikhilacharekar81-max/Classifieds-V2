import { AppClientRouter } from '@/components/AppClientRouter';
import { listingRepository } from '@/server/repositories/listing.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classifieds V2 — India\'s Leading Community Marketplace',
  description:
    'Free classified ads in India. Buy and sell used cars, mobile phones, apartments for rent, electronics, jobs, furniture, and local services.',
  alternates: {
    canonical: 'https://chillyads.com/',
  },
  openGraph: {
    title: 'Classifieds V2 — Free Classified Ads in India',
    description:
      'Buy and sell second-hand cars, phones, flats, jobs, and home services directly from verified owners.',
    url: 'https://chillyads.com/',
    type: 'website',
  },
};

export default async function HomePage() {
  const [listingsData, categories] = await Promise.all([
    listingRepository.findMarketplaceListings({ limit: 8 }),
    categoryRepository.findAll(),
  ]);

  const topCategories = categories.filter((c) => !c.parentId && c.isActive).slice(0, 8);

  return (
    <>
      <AppClientRouter initialPath="/" />
      <section
        aria-label="Verified Marketplace Directory"
        className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Classifieds V2 — Verified Community Marketplace
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Showing {listingsData.total} verified listings across {categories.length} categories in PostgreSQL.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/mumbai/${cat.slug}`}
                  className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {listingsData.items.map((item) => (
              <article
                key={item.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
              >
                <Link
                  href={`/${item.location.city.toLowerCase().replace(/\s+/g, '-')}/${item.categoryId}/${item.id}`}
                  className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600 line-clamp-1"
                >
                  {item.title}
                </Link>
                <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{item.price.toLocaleString('en-IN')}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.location.locality}, {item.location.city} — {item.description.slice(0, 90)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
