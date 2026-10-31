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

export default async function AdminSubRoutePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const subPath = slug && slug.length > 0 ? `/admin/${slug.join('/')}` : '/admin';
  return <AppClientRouter initialPath={subPath} />;
}
