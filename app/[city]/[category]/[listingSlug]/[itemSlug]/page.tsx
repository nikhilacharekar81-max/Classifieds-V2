import type { Metadata } from 'next';
import { listingRepository } from '@/server/repositories/listing.repository';
import { stripChillySuffixes } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';
import { notFound } from 'next/navigation';

interface FourSegmentListingPageProps {
  params: Promise<{
    city: string;
    category: string;
    listingSlug: string;
    itemSlug: string;
  }>;
}

export async function generateMetadata({ params }: FourSegmentListingPageProps): Promise<Metadata> {
  const { city, category, listingSlug, itemSlug } = await params;
  const { itemId } = stripChillySuffixes(itemSlug);

  const listing = itemId ? await listingRepository.findById(itemId) : null;
  if (!listing || listing.status !== 'approved') {
    return {
      title: 'Listing Not Found | Classifieds V2',
      description: 'The requested classified ad could not be found or has expired.',
    };
  }

  const title = `${listing.title} — ₹${listing.price.toLocaleString('en-IN')} in ${listing.location.city} | Classifieds V2`;
  const description = `${listing.title}. Price: ₹${listing.price.toLocaleString('en-IN')}. Located in ${listing.location.locality}, ${listing.location.city}. ${listing.description.slice(0, 150)}...`;
  const imageUrl =
    listing.images?.[0] ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

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
      canonical: `/${city}/${category}/${listingSlug}/${itemSlug}`,
    },
  };
}

export default async function FourSegmentListingPage({ params }: FourSegmentListingPageProps) {
  const { city, category, listingSlug, itemSlug } = await params;
  const { itemId } = stripChillySuffixes(itemSlug);

  if (!itemId) {
    notFound();
  }

  const listing = await listingRepository.findById(itemId);

  if (!listing || listing.status !== 'approved') {
    notFound();
  }

  const relatedResult = await listingRepository.findMarketplaceListings({
    status: 'approved',
    category: listing.categoryId,
    limit: 5,
    offset: 0,
  });

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
        initialPath={`/${city}/${category}/${listingSlug}/${itemSlug}`}
        initialListing={listing}
        initialListings={relatedResult.items}
      />
    </>
  );
}
