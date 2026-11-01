import { AppClientRouter } from '@/components/AppClientRouter';
import { listingRepository } from '@/server/repositories/listing.repository';
import { serializeJsonLd } from '@/lib/utils/seoAndUrlHelper';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Classifieds V2 — India's Leading Community Marketplace",
  description:
    'Free classified ads in India. Buy and sell used cars, mobile phones, apartments for rent, electronics, jobs, furniture, and local services.',
  alternates: {
    canonical: 'https://chillyads.com/',
  },
  openGraph: {
    title: 'Classifieds V2 — Free Classified Ads in India',
    description:
      'Buy and sell second-hand cars, phones, flats, jobs, and home services directly from verified owners.',
    url: 'https://chillyads.com/',
    type: 'website',
  },
};

export default async function HomePage() {
  const latestResult = await listingRepository.findMarketplaceListings({
    status: 'approved',
    limit: 10,
    offset: 0,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Chillyads',
        url: 'https://chillyads.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://chillyads.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'Chillyads India Pvt Ltd',
        url: 'https://chillyads.com/',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <AppClientRouter
        initialPath="/"
        initialListings={latestResult.items}
        initialTotalListings={latestResult.total}
      />
    </>
  );
}

