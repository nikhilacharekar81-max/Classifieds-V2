import type { Metadata } from 'next';
import { INITIAL_LOCATIONS, INITIAL_CATEGORIES } from '@/lib/data/initialData';
import { unslugifyCity, unslugifyCategory } from '@/lib/utils/seoAndUrlHelper';
import { AppClientRouter } from '@/components/AppClientRouter';

interface CategoryCityPageProps {
  params: Promise<{ city: string; category: string }>;
}

export async function generateMetadata({ params }: CategoryCityPageProps): Promise<Metadata> {
  const { city, category } = await params;
  const { cityName } = unslugifyCity(city, INITIAL_LOCATIONS);
  const { categoryObj } = unslugifyCategory(category, INITIAL_CATEGORIES);
  const categoryName = categoryObj ? categoryObj.name : category.replace(/_/g, ' ');

  const title = `${categoryName} in ${cityName} — Buy, Sell & Best Deals`;
  const description = `Explore ${categoryName} for sale and services in ${cityName}. Compare prices, inspect photos, chat with verified sellers directly, or post your free ad today!`;

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
      canonical: `/${city}/${category}`,
    },
  };
}

export default async function CategoryCityPage({ params }: CategoryCityPageProps) {
  const { city, category } = await params;
  const { cityName } = unslugifyCity(city, INITIAL_LOCATIONS);
  const { categoryObj } = unslugifyCategory(category, INITIAL_CATEGORIES);
  const categoryName = categoryObj ? categoryObj.name : category;

  return (
    <>
      <div className="sr-only" aria-hidden="true">
        <h1>{categoryName} in {cityName}</h1>
        <p>
          Browse top verified listings for {categoryName} in {cityName}.
          Direct seller contact, zero commissions, real-time safety warnings, and instant chat.
        </p>
      </div>
      <AppClientRouter />
    </>
  );
}
