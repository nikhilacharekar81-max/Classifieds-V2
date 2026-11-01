import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locationRepository } from '@/server/repositories/location.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { AppClientRouter } from '@/components/AppClientRouter';
import { stripChillySuffixes, unslugifyCity, serializeJsonLd } from '@/lib/utils/seoAndUrlHelper';

interface CategoryCityPageProps {
  params: Promise<{ city: string; category: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
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

export default async function CategoryCityPage({ params, searchParams }: CategoryCityPageProps) {
  const { city, category } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const cleanQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolvedSearch)) {
    if (typeof v === 'string') cleanQuery[k] = v;
  }

  const { cleanSlug: cleanCitySlug } = stripChillySuffixes(city);
  const { cleanSlug: cleanCatSlug } = stripChillySuffixes(category);

  const [locations, loc, cat] = await Promise.all([
    locationRepository.findAll(),
    locationRepository.findBySlug(cleanCitySlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanCatSlug).then((r) => r || categoryRepository.findBySlug(category)),
  ]);

  const isSpecialCity = cleanCitySlug === 'all-india' || cleanCitySlug === 'india' || cleanCitySlug === 'all';
  const isSpecialCategory = cleanCatSlug === 'all';
  if ((!loc && !isSpecialCity) || (!cat && !isSpecialCategory)) {
    notFound();
  }

  const cityName = loc ? loc.name : unslugifyCity(city, locations).cityName;
  const categoryName = cat ? cat.name : cleanCatSlug.charAt(0).toUpperCase() + cleanCatSlug.slice(1);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://chillyads.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: cityName,
        item: `https://chillyads.com/${city}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `https://chillyads.com/${city}/${category}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <AppClientRouter
        initialPath={`/${city}/${category}`}
        initialQuery={cleanQuery}
      />
    </>
  );
}

