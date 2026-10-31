import type { Metadata } from 'next';
import { INITIAL_LISTINGS } from '@/lib/data/initialData';
import { findListingById, stripChillySuffixes } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';

interface ListingPageProps {
  params: Promise<{ city: string; category: string; listingSlug: string }>;
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { city, category, listingSlug } = await params;
  const { itemId } = stripChillySuffixes(listingSlug);

  // Try finding the listing from seeded listings
  const listing = itemId ? findListingById(INITIAL_LISTINGS, itemId) : INITIAL_LISTINGS[0];

  const title = listing ? `${listing.title} — For Sale in ${listing.location?.city || city}` : 'Classified Listing';
  const description = listing
    ? `${listing.title}. Price: ₹${listing.price.toLocaleString()}. Located in ${listing.location?.city || city}. ${listing.description.slice(0, 150)}...`
    : 'View listing details on Classifieds.';
  const imageUrl = listing?.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

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
          alt: listing?.title || 'Listing Image',
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

export default async function ListingHierarchicalPage({ params }: ListingPageProps) {
  const { city, category, listingSlug } = await params;
  const { itemId } = stripChillySuffixes(listingSlug);
  const listing = itemId ? findListingById(INITIAL_LISTINGS, itemId) : INITIAL_LISTINGS[0];

  const jsonLd = listing
    ? {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: listing.title,
        image: listing.images,
        description: listing.description,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: listing.price,
          availability: listing.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
          seller: {
            '@type': 'Person',
            name: listing.sellerName,
          },
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="sr-only" aria-hidden="true">
        <h1>{listing ? listing.title : 'Listing Details'}</h1>
        <p>{listing?.description}</p>
        <div>Price: ₹{listing?.price.toLocaleString()}</div>
        <div>Location: {listing?.location?.locality}, {listing?.location?.city}</div>
      </div>
      <AppClientRouter />
    </>
  );
}
