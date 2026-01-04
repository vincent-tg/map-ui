'use client';

import { LocationPoint } from '@/types';
import { formatDistance } from '@/lib/location';

interface LiveLocationPanelProps {
  position: LocationPoint | null;
  isTracking: boolean;
  error?: GeolocationPositionError | null;
  onCenterMap?: () => void;
  onRequestPermission?: () => void;
}

export default function LiveLocationPanel({
  position,
  isTracking,
  error,
  onCenterMap,
  onRequestPermission,
}: LiveLocationPanelProps) {
  // Show error state (but not for timeout if we're still tracking)
  if (error && (!isTracking || error.code !== 3)) {
    const getErrorMessage = () => {
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          return 'Location permission denied. Please allow location access in your browser settings.';
        case 2: // POSITION_UNAVAILABLE
          return 'Location unavailable. Please check your GPS/network connection.';
        case 3: // TIMEOUT
          return 'Getting location fix... This may take a moment. Make sure GPS is enabled and you have a clear view of the sky.';
        default:
          return error.message || 'Unable to get your location.';
      }
    };

    const isTimeout = error.code === 3;

    return (
      <div className={`absolute top-4 left-4 rounded-lg shadow-lg p-4 z-10 max-w-xs ${
        isTimeout ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${
            isTimeout ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-semibold ${
            isTimeout ? 'text-yellow-700' : 'text-red-600'
          }`}>
            {isTimeout ? 'Acquiring Location' : 'Location Error'}
          </span>
        </div>
        <p className={`text-xs mb-3 ${isTimeout ? 'text-yellow-700' : 'text-gray-600'}`}>
          {getErrorMessage()}
        </p>
        {error.code === 1 && onRequestPermission && (
          <button
            onClick={onRequestPermission}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
          >
            Request Permission
          </button>
        )}
      </div>
    );
  }

  // Show waiting state
  if (!position) {
    return (
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Requesting location...</span>
        </div>
        <p className="text-xs text-gray-500">
          {isTracking
            ? 'Waiting for GPS signal...'
            : 'Please allow location access when prompted.'}
        </p>
        {!isTracking && onRequestPermission && (
          <button
            onClick={onRequestPermission}
            className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
          >
            Enable Location
          </button>
        )}
      </div>
    );
  }

  const formatCoordinate = (coord: number, isLat: boolean): string => {
    const direction = isLat
      ? coord >= 0
        ? 'N'
        : 'S'
      : coord >= 0
      ? 'E'
      : 'W';
    return `${Math.abs(coord).toFixed(6)}° ${direction}`;
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          ></div>
          <span className="text-sm font-semibold">
            {isTracking ? 'Live Location' : 'Location'}
          </span>
        </div>
        {onCenterMap && position && (
          <button
            onClick={onCenterMap}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center gap-1"
            title="Center map on your location"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Center
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600 text-xs">Latitude:</span>
          <p className="font-mono text-xs">{formatCoordinate(position.latitude, true)}</p>
        </div>
        <div>
          <span className="text-gray-600 text-xs">Longitude:</span>
          <p className="font-mono text-xs">{formatCoordinate(position.longitude, false)}</p>
        </div>

        {position.accuracy && (
          <div>
            <span className="text-gray-600 text-xs">Accuracy:</span>
            <p className="text-xs">{formatDistance(position.accuracy)}</p>
          </div>
        )}

        {position.speed !== null && position.speed !== undefined && position.speed > 0 && (
          <div>
            <span className="text-gray-600 text-xs">Speed:</span>
            <p className="text-xs">
              {(position.speed * 3.6).toFixed(1)} km/h
            </p>
          </div>
        )}

        {position.heading !== null && position.heading !== undefined && (
          <div>
            <span className="text-gray-600 text-xs">Heading:</span>
            <p className="text-xs">{Math.round(position.heading)}°</p>
          </div>
        )}

        {position.altitude !== null && position.altitude !== undefined && (
          <div>
            <span className="text-gray-600 text-xs">Altitude:</span>
            <p className="text-xs">{Math.round(position.altitude)}m</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200">
          <span className="text-gray-600 text-xs">Last Update:</span>
          <p className="text-xs">
            {new Date(position.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

