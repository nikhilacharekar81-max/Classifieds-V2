import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locationRepository } from '@/server/repositories/location.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { listingService } from '@/server/services/listing.service';
import { AppClientRouter } from '@/components/AppClientRouter';
import { stripChillySuffixes, unslugifyCity, unslugifyCategory, serializeJsonLd } from '@/lib/utils/seoAndUrlHelper';

export const dynamic = 'force-dynamic';

interface CategoryCityPageProps {
  params: Promise<{ city: string; category: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params, searchParams }: CategoryCityPageProps): Promise<Metadata> {
  const { city, category } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const pageNum = Math.max(1, Number(resolvedSearch.page) || 1);
  const pageSuffix = pageNum > 1 ? ` (Page ${pageNum})` : '';
  const canonicalUrl = pageNum > 1 ? `/${city}/${category}?page=${pageNum}` : `/${city}/${category}`;

  const { cleanSlug: cleanCitySlug } = stripChillySuffixes(city);
  const { cleanSlug: cleanCatSlug } = stripChillySuffixes(category);

  const [loc, firstCat, secondCat, allCategories] = await Promise.all([
    locationRepository.findBySlug(cleanCitySlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanCitySlug).then((r) => r || categoryRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanCatSlug).then((r) => r || categoryRepository.findBySlug(category)),
    categoryRepository.findAll(),
  ]);

  const resolvedSecondCat = secondCat || unslugifyCategory(category, allCategories).categoryObj;

  if (!loc && firstCat && resolvedSecondCat) {
    const title = `${resolvedSecondCat.name} (${firstCat.name}) in India${pageSuffix} — Buy, Sell & Best Deals | Classifieds V2`;
    const description = `Explore verified ${resolvedSecondCat.name} classified ads under ${firstCat.name} across India${pageSuffix}. Compare prices, inspect photos, and chat with verified sellers directly.`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: canonicalUrl },
    };
  }

  const cityName = loc ? loc.name : unslugifyCity(city).cityName;
  const categoryName = resolvedSecondCat
    ? resolvedSecondCat.name
    : cleanCatSlug.charAt(0).toUpperCase() + cleanCatSlug.slice(1);

  const title = `${categoryName} in ${cityName}${pageSuffix} — Buy, Sell & Best Deals | Classifieds V2`;
  const description = `Explore ${categoryName} for sale and services in ${cityName}${pageSuffix}. Compare prices, inspect photos, and chat with verified sellers directly.`;

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
      canonical: canonicalUrl,
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

  const [locations, allCategories, loc, firstCat, secondCat] = await Promise.all([
    locationRepository.findAll(),
    categoryRepository.findAll(),
    locationRepository.findBySlug(cleanCitySlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanCitySlug).then((r) => r || categoryRepository.findBySlug(city)),
    categoryRepository.findBySlug(cleanCatSlug).then((r) => r || categoryRepository.findBySlug(category)),
  ]);

  const resolvedFirstCat = firstCat || unslugifyCategory(city, allCategories).categoryObj;
  const resolvedSecondCat = secondCat || unslugifyCategory(category, allCategories).categoryObj;

  // Case 1: 2-segment All-India ParentCategory + Subcategory route (e.g. /services/home-services-repairs, /bikes/motorcycles)
  if (!loc && resolvedFirstCat && resolvedSecondCat) {
    const paginated = await listingService.getPaginatedPageListings({
      category: resolvedFirstCat.id,
      subcategory: resolvedSecondCat.id,
      query: cleanQuery,
      pageSize: 50,
    });

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
          name: resolvedFirstCat.name,
          item: `https://chillyads.com/${city}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: resolvedSecondCat.name,
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
          initialListings={paginated.items}
          initialTotalListings={paginated.total}
          initialPage={paginated.page}
        />
      </>
    );
  }

  // Case 2: /{city}/post or /{city}/sell
  if ((loc || cleanCitySlug === 'all-india') && (cleanCatSlug === 'post' || cleanCatSlug === 'sell')) {
    return (
      <AppClientRouter
        initialPath={`/${city}/${category}`}
        initialQuery={cleanQuery}
      />
    );
  }

  const isSpecialCity = cleanCitySlug === 'all-india' || cleanCitySlug === 'india' || cleanCitySlug === 'all';
  const isSpecialCategory = cleanCatSlug === 'all';
  if ((!loc && !isSpecialCity) || (!resolvedSecondCat && !isSpecialCategory)) {
    notFound();
  }

  const cityName = loc ? loc.name : unslugifyCity(city, locations).cityName;
  const categoryName = resolvedSecondCat
    ? resolvedSecondCat.name
    : cleanCatSlug.charAt(0).toUpperCase() + cleanCatSlug.slice(1);

  const parentCatId = resolvedSecondCat
    ? resolvedSecondCat.parentId || resolvedSecondCat.id
    : undefined;
  const subCatId =
    resolvedSecondCat && resolvedSecondCat.parentId ? resolvedSecondCat.id : undefined;

  const paginated = await listingService.getPaginatedPageListings({
    city: loc ? loc.name : undefined,
    category: parentCatId,
    subcategory: subCatId,
    query: cleanQuery,
    pageSize: 50,
  });

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
        initialListings={paginated.items}
        initialTotalListings={paginated.total}
        initialPage={paginated.page}
      />
    </>
  );
}

