'use client';

import { useEffect } from 'react';
import { filterExtensionErrors } from '@/lib/console-filter';

/**
 * Component to filter browser extension errors from console
 * This prevents extension errors from cluttering the console
 */
export default function ConsoleFilter() {
  useEffect(() => {
    // Only filter in development to avoid hiding real errors in production
    if (process.env.NODE_ENV === 'development') {
      filterExtensionErrors();
    }
  }, []);

  return null;
}

