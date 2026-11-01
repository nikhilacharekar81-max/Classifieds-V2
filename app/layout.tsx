import type { Metadata } from 'next';
import './globals.css';
import { ClientAppProvider } from '@/components/ClientAppProvider';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { cmsRepository } from '@/server/repositories/cms.repository';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.chillyads.in'),
  title: 'Chillyads — Leading Verified Marketplace & Classifieds',
  description:
    'Buy, sell, and discover Cars, Mobiles, Real Estate, Electronics, Jobs, and Local Services with verified sellers, instant chat, and ad boost priority.',
  openGraph: {
    title: 'Classifieds V2 — Leading Verified Marketplace & Classifieds',
    description:
      'Buy, sell, and discover Cars, Mobiles, Real Estate, Electronics, Jobs, and Local Services with verified sellers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Classifieds V2 — Leading Verified Marketplace & Classifieds',
    description:
      'Buy, sell, and discover Cars, Mobiles, Real Estate, Electronics, Jobs, and Local Services with verified sellers.',
  },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialServerData = undefined;
  try {
    const [categories, locations, settings, cmsPages] = await Promise.all([
      categoryRepository.findAll(),
      locationRepository.findAll(),
      adminRepository.getSystemSettings(),
      cmsRepository.findAllPages(),
    ]);
    initialServerData = {
      categories,
      locations,
      settings,
      cmsPages,
    };
  } catch (err) {
    console.error('RootLayout initial data fetch error:', err);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans selection:bg-emerald-500 selection:text-white"
        suppressHydrationWarning
      >
        <ClientAppProvider initialServerData={initialServerData}>
          {children}
        </ClientAppProvider>
      </body>
    </html>
  );
}

