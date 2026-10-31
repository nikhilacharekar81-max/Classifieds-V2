import type { Metadata } from 'next';
import { listingRepository } from '@/server/repositories/listing.repository';
import { stripChillySuffixes } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';
import { notFound } from 'next/navigation';

interface ListingPageProps {
  params: Promise<{ city: string; category: string; listingSlug: string }>;
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { city, category, listingSlug } = await params;
  const { itemId } = stripChillySuffixes(listingSlug);

  // Authoritative PostgreSQL query
  const listing = itemId ? await listingRepository.findById(itemId) : null;
  if (!listing) {
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

export default async function ListingHierarchicalPage({ params }: ListingPageProps) {
  const { city, category, listingSlug } = await params;
  const { itemId } = stripChillySuffixes(listingSlug);

  // Authoritative PostgreSQL fetch
  const listing = itemId ? await listingRepository.findById(itemId) : null;

  // Schema.org structured data for Google Rich Results
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

      {/* Interactive Marketplace Interface */}
      <AppClientRouter initialPath={`/${city}/${category}/${listingSlug}`} />

      {/* Visible Server-Rendered HTML from PostgreSQL */}
      {listing && (
        <article
          className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8"
          aria-label={listing.title}
        >
          <div className="max-w-5xl mx-auto space-y-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{listing.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{listing.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                Price: ₹{listing.price.toLocaleString('en-IN')}
              </div>
              <div>
                Location: {listing.location.locality}, {listing.location.city}, {listing.location.state}
              </div>
              <div>Seller: {listing.sellerName}</div>
              <div>Status: {listing.status}</div>
            </div>
          </div>
        </article>
      )}
    </>
  );
}
