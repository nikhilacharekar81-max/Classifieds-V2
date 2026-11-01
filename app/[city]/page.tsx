import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locationRepository } from '@/server/repositories/location.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { AppClientRouter } from '@/components/AppClientRouter';
import { stripChillySuffixes, unslugifyCity, serializeJsonLd } from '@/lib/utils/seoAndUrlHelper';

interface CityPageProps {
  params: Promise<{ city: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const { cleanSlug } = stripChillySuffixes(city);

  const [loc, cat] = await Promise.all([
    locationRepository.findBySlug(cleanSlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanSlug).then((r) => r || categoryRepository.findBySlug(city)),
  ]);

  if (!loc && cat) {
    const title = `${cat.name} in India — Buy, Sell & Best Deals | Classifieds V2`;
    const description = `Explore verified ${cat.name} classified ads across India. Compare prices, inspect photos, and chat directly with verified sellers.`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: `/${city}` },
    };
  }

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

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { city } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const cleanQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolvedSearch)) {
    if (typeof v === 'string') cleanQuery[k] = v;
  }

  const { cleanSlug } = stripChillySuffixes(city);

  const [locations, loc, cat] = await Promise.all([
    locationRepository.findAll(),
    locationRepository.findBySlug(cleanSlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanSlug).then((r) => r || categoryRepository.findBySlug(city)),
  ]);

  const isSpecialCity = cleanSlug === 'all-india' || cleanSlug === 'india' || cleanSlug === 'all';
  if (!loc && !cat && !isSpecialCity) {
    notFound();
  }

  const cityName = loc ? loc.name : unslugifyCity(city, locations).cityName;

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
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <AppClientRouter
        initialPath={`/${city}`}
        initialQuery={cleanQuery}
      />
    </>
  );
}

