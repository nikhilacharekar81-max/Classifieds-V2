import { AppClientRouter } from '@/components/AppClientRouter';
import { listingService } from '@/server/services/listing.service';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await listingService.getListingById(id);

  if (!listing) {
    return {
      title: 'Classified Ad Not Found | Classifieds V2',
      description: 'The requested listing may have expired or been sold.',
    };
  }

  const priceText = `₹${listing.price.toLocaleString('en-IN')}`;
  return {
    title: `${listing.title} - ${priceText} in ${listing.location.city} | Classifieds V2`,
    description: listing.description.slice(0, 160),
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
  const listing = await listingService.getListingById(id);

  return (
    <>
      <AppClientRouter initialPath={`/item/${id}`} />
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
