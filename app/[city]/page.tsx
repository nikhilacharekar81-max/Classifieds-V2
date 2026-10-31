import type { Metadata } from 'next';
import { INITIAL_LOCATIONS, INITIAL_CATEGORIES } from '@/lib/data/initialData';
import { unslugifyCity, stripChillySuffixes } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const { cityName } = unslugifyCity(city, INITIAL_LOCATIONS);

  const title = `Classified Ads in ${cityName} — Free Buy, Sell, Jobs & Services`;
  const description = `Browse free local classified ads in ${cityName}. Find second-hand cars, bikes, mobile phones, apartments for rent, electronics, jobs and services. Post free ads in ${cityName}.`;

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
      canonical: `/${city}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const { cityName } = unslugifyCity(city, INITIAL_LOCATIONS);

  // Render SSR semantic content for search engines and screen readers
  return (
    <>
      <div className="sr-only" aria-hidden="true">
        <h1>Classifieds in {cityName}</h1>
        <p>
          Find the best deals across {INITIAL_CATEGORIES.length} categories in {cityName}.
          Post free ads or explore verified listings from trusted sellers.
        </p>
      </div>
      <AppClientRouter />
    </>
  );
}
