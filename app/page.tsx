import { AppProvider } from '@/context/AppContext';
import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classifieds V2 — India\'s Leading Community Marketplace',
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

export default function HomePage() {
  return (
    <AppProvider>
      <AppClientRouter />
    </AppProvider>
  );
}
