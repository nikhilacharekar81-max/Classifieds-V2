import { AppClientRouter } from '@/components/AppClientRouter';
import { listingService } from '@/server/services/listing.service';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : {};
  const q = resolved.q?.trim();
  const city = resolved.city?.trim();
  const pageNum = Math.max(1, Number(resolved.page) || 1);
  const pageSuffix = pageNum > 1 ? ` (Page ${pageNum})` : '';

  const title = q
    ? `Search Results for "${q}"${city ? ` in ${city}` : ''}${pageSuffix} | Classifieds V2`
    : `Search Classified Ads — Cars, Phones, Flats & Jobs${pageSuffix} | Classifieds V2`;
  const description = q
    ? `Browse verified classified ads matching "${q}"${city ? ` in ${city}` : ''}${pageSuffix}. Compare prices and chat directly with sellers.`
    : `Search verified classified ads for cars, mobile phones, real estate, jobs, and local services across India${pageSuffix}.`;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (pageNum > 1) params.set('page', String(pageNum));
  const qs = params.toString();

  return {
    title,
    description,
    alternates: {
      canonical: qs ? `/search?${qs}` : '/search',
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const cleanQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolved)) {
    if (typeof v === 'string') cleanQuery[k] = v;
  }

  const paginated = await listingService.getPaginatedPageListings({
    city: cleanQuery.city,
    category: cleanQuery.category,
    subcategory: cleanQuery.subcategory,
    query: cleanQuery,
    pageSize: 50,
  });

  return (
    <AppClientRouter
      initialPath="/search"
      initialQuery={cleanQuery}
      initialListings={paginated.items}
      initialTotalListings={paginated.total}
      initialPage={paginated.page}
    />
  );
}
