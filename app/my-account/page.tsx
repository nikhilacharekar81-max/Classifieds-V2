import { AppClientRouter } from '@/components/AppClientRouter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Account & Ads Management | Classifieds V2',
  description: 'Manage your active listings, saved favorites, invoices, buyer messages, and KYC verification.',
};

export default function MyAccountPage() {
  return <AppClientRouter initialPath="/my-account" />;
}
