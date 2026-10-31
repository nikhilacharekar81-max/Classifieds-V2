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
      <section className="sr-only" aria-label={`${categoryName} listings in ${cityName}`}>
        <h1>{categoryName} in {cityName}</h1>
        <p>
          Showing {listingsData.total} verified classified ads for {categoryName} in {cityName}.
        </p>
        <ul>
          {listingsData.items.map((item) => (
            <li key={item.id}>
              <Link href={`/${city}/${category}/${item.id}`}>
                {item.title} — ₹{item.price.toLocaleString('en-IN')}
              </Link>
              <p>{item.description.slice(0, 100)}...</p>
            </li>
          ))}
        </ul>
      </section>

      <AppClientRouter />
    </>
  );
}
