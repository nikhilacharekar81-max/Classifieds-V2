import { AppProvider } from '@/context/AppContext';
import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Classified Ads | Classifieds V2',
  description: 'Search cars, phones, flats, and services across India.',
};

export default function SearchPage() {
  return (
    <AppProvider>
      <AppClientRouter />
    </AppProvider>
  );
}
