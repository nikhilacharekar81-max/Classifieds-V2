'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RouteInfo {
  path: string;
  params: Record<string, string>;
  search: string;
  query: Record<string, string>;
}

export function parsePath(rawPathAndSearch?: string): { path: string; query: Record<string, string> } {
  let raw = rawPathAndSearch;
  if (!raw) {
    if (typeof window !== 'undefined') {
      raw = window.location.pathname + window.location.search;
    } else {
      raw = '/';
    }
  }
  if (raw.includes('#')) {
    raw = raw.split('#')[0];
  }
  if (!raw.startsWith('/')) {
    raw = '/' + raw;
  }

  const [pathPart, queryPart] = raw.split('?');
  const query: Record<string, string> = {};

  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      query[key] = val;
    });
  }

  return { path: pathPart || '/', query };
}

export function navigateTo(targetUrl: string) {
  if (typeof window === 'undefined') return;

  let cleanUrl = targetUrl;
  if (cleanUrl.startsWith('#')) {
    cleanUrl = cleanUrl.replace(/^#\/?/, '/');
  }
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = '/' + cleanUrl;
  }

  const currentFull = window.location.pathname + window.location.search;
  if (currentFull !== cleanUrl) {
    window.history.pushState({}, '', cleanUrl);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRouter() {
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const { path, query } = parsePath(currentUrl);

  const navigate = useCallback((url: string) => {
    navigateTo(url);
  }, []);

  return {
    path,
    query,
    navigate,
    navigateTo,
  };
}
