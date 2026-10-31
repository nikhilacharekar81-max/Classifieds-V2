import type { Metadata } from 'next';
import './globals.css';
import { ClientAppProvider } from '@/components/ClientAppProvider';

export const metadata: Metadata = {
  title: 'Classifieds V2 — Leading Verified Marketplace & Classifieds',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans selection:bg-emerald-500 selection:text-white"
        suppressHydrationWarning
      >
        <ClientAppProvider>{children}</ClientAppProvider>
      </body>
    </html>
  );
}
