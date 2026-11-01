import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center text-slate-900 dark:text-white">
      <div className="max-w-md space-y-4">
        <h1 className="text-6xl font-black text-blue-600 dark:text-blue-400">404</h1>
        <h2 className="text-2xl font-bold tracking-tight">Page or Listing Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The requested marketplace page or classified ad listing may have expired, been removed, or moved to a different city/category route.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
          >
            Return to Chillyads Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
