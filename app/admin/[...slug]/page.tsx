import { AppProvider } from '@/context/AppContext';
import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Suite & Workspace | Classifieds V2',
  description: 'Enterprise administration workspace.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSubRoutePage() {
  return (
    <AppProvider>
      <AppClientRouter />
    </AppProvider>
  );
}
