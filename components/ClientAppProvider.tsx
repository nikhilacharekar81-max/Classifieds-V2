'use client';

import React from 'react';
import { AppProvider, InitialServerData } from '@/context/AppContext';

export function ClientAppProvider({
  children,
  initialServerData,
}: {
  children: React.ReactNode;
  initialServerData?: InitialServerData;
}) {
  return <AppProvider initialServerData={initialServerData}>{children}</AppProvider>;
}

