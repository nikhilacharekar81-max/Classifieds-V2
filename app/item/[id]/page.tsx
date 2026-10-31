import { AppClientRouter } from '@/components/AppClientRouter';
import { listingRepository } from '@/server/repositories/listing.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [listing, categories] = await Promise.all([
    listingRepository.findById(id),
    categoryRepository.findAll(),
  ]);

  if (!listing || listing.status !== 'approved') {
    return {
      title: 'Classified Ad Not Found | Classifieds V2',
      description: 'The requested listing may have expired or been sold.',
    };
  }

  const priceText = `₹${listing.price.toLocaleString('en-IN')}`;
  const canonicalPath = buildChillyUrl({ listing, categories });

  return {
    title: `${listing.title} - ${priceText} in ${listing.location.city} | Classifieds V2`,
    description: listing.description.slice(0, 160),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${listing.title} - ${priceText}`,
      description: listing.description.slice(0, 160),
      images: listing.images && listing.images.length > 0 ? [{ url: listing.images[0] }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${listing.title} - ${priceText}`,
      description: listing.description.slice(0, 160),
      images: listing.images && listing.images.length > 0 ? [listing.images[0]] : [],
    },
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, listingsData, categories, locations] = await Promise.all([
    listingRepository.findById(id),
    listingRepository.findMarketplaceListings({ status: 'approved', limit: 500 }),
    categoryRepository.findAll(),
    locationRepository.findAll(),
  ]);

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppClientRouter
        initialPath={`/item/${id}`}
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
