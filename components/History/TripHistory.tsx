'use client';

import { useState } from 'react';
import { Trip } from '@/types';
import { formatDistance, formatDuration } from '@/lib/location';
import { format } from 'date-fns';
import { exportTripAsJSON, exportTripAsGPX } from '@/lib/storage';

interface TripHistoryProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onClearAll: () => void;
}

export default function TripHistory({
  trips,
  onSelectTrip,
  onDeleteTrip,
  onClearAll,
}: TripHistoryProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const handleExportJSON = (trip: Trip) => {
    const json = exportTripAsJSON(trip);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${trip.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGPX = (trip: Trip) => {
    const gpx = exportTripAsGPX(trip);
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${trip.id}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (trips.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No trips recorded yet.</p>
        <p className="text-sm mt-2">Start tracking your location to record trips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Trip History</h2>
        {trips.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2">
        {trips
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
          .map((trip) => (
            <div
              key={trip.id}
              className={`bg-white rounded-lg shadow p-4 border-2 transition ${
                selectedTripId === trip.id
                  ? 'border-blue-500'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {trip.name || `Trip ${format(trip.startTime, 'MMM dd, yyyy HH:mm')}`}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Date:</span>
                      <p>{format(trip.startTime, 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p>{formatDuration(trip.duration)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Distance:</span>
                      <p>{formatDistance(trip.distance)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Avg Speed:</span>
                      <p>{trip.averageSpeed.toFixed(1)} km/h</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedTripId(trip.id);
                    onSelectTrip(trip);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                >
                  View on Map
                </button>
                <button
                  onClick={() => handleExportJSON(trip)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => handleExportGPX(trip)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                >
                  Export GPX
                </button>
                <button
                  onClick={() => onDeleteTrip(trip.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

