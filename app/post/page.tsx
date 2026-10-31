import { AppProvider } from '@/context/AppContext';
import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post Free Classified Ad | Classifieds V2',
  description: 'Sell second-hand goods, cars, mobile phones, or post property listings in India.',
};

export default function PostPage() {
  return (
    <AppProvider>
      <AppClientRouter />
    </AppProvider>
  );
}
