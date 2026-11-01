import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : {};
  const q = resolved.q?.trim();
  const city = resolved.city?.trim();

  const title = q
    ? `Search Results for "${q}"${city ? ` in ${city}` : ''} | Classifieds V2`
    : 'Search Classified Ads — Cars, Phones, Flats & Jobs | Classifieds V2';
  const description = q
    ? `Browse verified classified ads matching "${q}"${city ? ` in ${city}` : ''}. Compare prices and chat directly with sellers.`
    : 'Search verified classified ads for cars, mobile phones, real estate, jobs, and local services across India.';

  return {
    title,
    description,
    alternates: {
      canonical: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const cleanQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(resolved)) {
    if (typeof v === 'string') cleanQuery[k] = v;
  }

  return (
    <AppClientRouter
      initialPath="/search"
      initialQuery={cleanQuery}
    />
  );
}
