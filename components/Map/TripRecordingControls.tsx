'use client';

import { useState } from 'react';
import { useTripHistory } from '@/hooks/useTripHistory';
import { formatDistance, formatDuration } from '@/lib/location';

interface TripRecordingControlsProps {
  onTripStart?: () => void;
  onTripStop?: () => void;
}

export default function TripRecordingControls({
  onTripStart,
  onTripStop,
}: TripRecordingControlsProps) {
  const { isRecording, currentTripLocations, startRecording, stopRecording } =
    useTripHistory();
  const [tripName, setTripName] = useState('');

  const handleStart = () => {
    startRecording();
    onTripStart?.();
  };

  const handleStop = () => {
    const trip = stopRecording(true, tripName || undefined);
    setTripName('');
    onTripStop?.();
  };

  const handleCancel = () => {
    stopRecording(false);
    setTripName('');
  };

  // Calculate current trip stats
  const currentDistance =
    currentTripLocations.length > 1
      ? currentTripLocations.reduce((total, loc, index) => {
          if (index === 0) return 0;
          const prev = currentTripLocations[index - 1];
          // Haversine formula for accurate distance
          const R = 6371000; // Earth's radius in meters
          const lat1 = (prev.latitude * Math.PI) / 180;
          const lat2 = (loc.latitude * Math.PI) / 180;
          const deltaLat = ((loc.latitude - prev.latitude) * Math.PI) / 180;
          const deltaLon = ((loc.longitude - prev.longitude) * Math.PI) / 180;
          const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) *
              Math.cos(lat2) *
              Math.sin(deltaLon / 2) *
              Math.sin(deltaLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return total + distance;
        }, 0)
      : 0;

  const currentDuration =
    currentTripLocations.length > 1
      ? (currentTripLocations[currentTripLocations.length - 1].timestamp -
          currentTripLocations[0].timestamp) /
        1000
      : 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
        {!isRecording ? (
          <div>
            <button
              onClick={handleStart}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
            >
              Start Recording Trip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-red-600">Recording...</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Distance:</span>
                <span className="ml-2 font-semibold">
                  {formatDistance(currentDistance)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-semibold">
                  {formatDuration(currentDuration)}
                </span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Trip name (optional)"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={handleStop}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                Save Trip
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

