'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Service Worker registered successfully');
          }
        })
        .catch((error) => {
          // Only log actual errors, ignore extension-related errors
          if (error && !error.message?.includes('receiving end')) {
            console.error('Service Worker registration failed:', error);
          }
        });
    }
  }, []);

  return null;
}

