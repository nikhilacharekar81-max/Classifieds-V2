import type { Metadata } from 'next';
import { listingRepository } from '@/server/repositories/listing.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { stripChillySuffixes, unslugifyCity, unslugifyCategory, serializeJsonLd } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';
import { notFound } from 'next/navigation';

interface ListingOrSubcategoryPageProps {
  params: Promise<{ city: string; category: string; listingSlug: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: ListingOrSubcategoryPageProps): Promise<Metadata> {
  const { city, category, listingSlug } = await params;
  const { itemId, cleanSlug: cleanThirdSlug } = stripChillySuffixes(listingSlug);

  if (itemId) {
    const listing = await listingRepository.findById(itemId);
    if (!listing || listing.status !== 'approved') {
      return {
        title: 'Listing Not Found | Classifieds V2',
        description: 'The requested classified ad could not be found or has expired.',
      };
    }

    const title = `${listing.title} — ₹${listing.price.toLocaleString('en-IN')} in ${listing.location.city} | Classifieds V2`;
    const description = `${listing.title}. Price: ₹${listing.price.toLocaleString('en-IN')}. Located in ${listing.location.locality}, ${listing.location.city}. ${listing.description.slice(0, 150)}...`;
    const imageUrl = listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: listing.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `/${city}/${category}/${listingSlug}`,
      },
    };
  }

  const { cleanSlug: cleanCitySlug } = stripChillySuffixes(city);
  const [loc, categories] = await Promise.all([
    locationRepository.findBySlug(cleanCitySlug).then((r) => r || locationRepository.findBySlug(city)),
    categoryRepository.findAll(),
  ]);

  const subCat =
    categories.find((c) => c.slug === cleanThirdSlug || c.slug === listingSlug) ||
    unslugifyCategory(listingSlug, categories).categoryObj;

  if (subCat) {
    const cityName = loc ? loc.name : unslugifyCity(city).cityName;
    const title = `${subCat.name} in ${cityName} — Buy, Sell & Verified Ads | Classifieds V2`;
    const description = `Browse verified ${subCat.name} classified ads in ${cityName}. Compare prices, view real photos, and contact local sellers directly.`;

    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: `/${city}/${category}/${listingSlug}` },
    };
  }

  return {
    title: 'Page Not Found | Classifieds V2',
    description: 'The requested page could not be found.',
  };
}

export default async function ListingHierarchicalPage({ params, searchParams }: ListingOrSubcategoryPageProps) {
  const { city, category, listingSlug } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const cleanQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolvedSearch)) {
    if (typeof v === 'string') cleanQuery[k] = v;
  }

  const { itemId, cleanSlug: cleanThirdSlug } = stripChillySuffixes(listingSlug);

  const [listingsData, categories, locations] = await Promise.all([
    listingRepository.findMarketplaceListings({ status: 'approved', limit: 500 }),
    categoryRepository.findAll(),
    locationRepository.findAll(),
  ]);

  if (itemId) {
    const listing = await listingRepository.findById(itemId);
    if (!listing || listing.status !== 'approved') {
      notFound();
    }

    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: listing.title,
      image: listing.images,
      description: listing.description,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: listing.price,
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/UsedCondition',
        seller: {
          '@type': 'Person',
          name: listing.sellerName,
        },
      },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <AppClientRouter
          initialPath={`/${city}/${category}/${listingSlug}`}
          initialListing={listing}
          initialServerData={{
            listings: listingsData.items,
            categories,
            locations,
          }}
        />
      </>
    );
  }

  const matchedSubCat =
    categories.find((c) => c.slug === cleanThirdSlug || c.slug === listingSlug) ||
    unslugifyCategory(listingSlug, categories).categoryObj;

  if (!matchedSubCat) {
    notFound();
  }

  const { cityName } = unslugifyCity(city, locations);
  const parentCat = categories.find((c) => c.id === matchedSubCat.parentId);

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
      ...(parentCat
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: parentCat.name,
              item: `https://chillyads.com/${city}/${category}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: parentCat ? 4 : 3,
        name: matchedSubCat.name,
        item: `https://chillyads.com/${city}/${category}/${listingSlug}`,
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
        initialPath={`/${city}/${category}/${listingSlug}`}
        initialQuery={cleanQuery}
        initialServerData={{
          listings: listingsData.items,
          categories,
          locations,
        }}
      />
    </>
  );
}

