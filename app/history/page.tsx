'use client';

import { useState, useEffect } from 'react';
import TripHistory from '@/components/History/TripHistory';
import { useTripHistory } from '@/hooks/useTripHistory';
import { Trip } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const { trips, removeTrip, clearAll, getTrip } = useTripHistory();
  const router = useRouter();

  const handleSelectTrip = (trip: Trip) => {
    // Store selected trip in sessionStorage to show on map
    sessionStorage.setItem('selectedTrip', JSON.stringify(trip));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Map Tracking
            </h1>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Back to Map
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TripHistory
          trips={trips}
          onSelectTrip={handleSelectTrip}
          onDeleteTrip={removeTrip}
          onClearAll={clearAll}
        />
      </main>
    </div>
  );
}

