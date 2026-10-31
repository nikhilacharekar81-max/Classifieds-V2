import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Suite & Control Center | Classifieds V2',
  description: 'Manage listings, moderation, categories, users, boost monetization, and email campaigns.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootPage() {
  return <AppClientRouter initialPath="/admin" />;
}
