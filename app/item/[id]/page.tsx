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

export default function ItemDetailPage() {
  return <AppClientRouter />;
}
