'use client';

import { LocationPoint } from '@/types';
import { formatDistance } from '@/lib/location';

interface LiveLocationPanelProps {
  readonly position: LocationPoint | null;
  readonly isTracking: boolean;
  readonly error?: GeolocationPositionError | null;
  readonly onCenterMap?: () => void;
  readonly onRequestPermission?: () => void;
}

// Helper: Get error message based on error code
function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case 1:
      return 'Location permission denied. Please allow location access in your browser settings.';
    case 2:
      return 'Location unavailable. Please check your GPS/network connection.';
    case 3:
      return 'Getting location fix... This may take a moment. Make sure GPS is enabled and you have a clear view of the sky.';
    default:
      return error.message || 'Unable to get your location.';
  }
}

// Helper: Format coordinate with direction
function formatCoordinate(coord: number, isLat: boolean): string {
  let direction: string;
  if (isLat) {
    direction = coord >= 0 ? 'N' : 'S';
  } else {
    direction = coord >= 0 ? 'E' : 'W';
  }
  return `${Math.abs(coord).toFixed(6)}° ${direction}`;
}

// Sub-component: Error state panel
function ErrorPanel({
  error,
  onRequestPermission,
}: {
  readonly error: GeolocationPositionError;
  readonly onRequestPermission?: () => void;
}) {
  const isTimeout = error.code === 3;
  const bgClass = isTimeout ? 'bg-yellow-50 border border-yellow-200' : 'bg-white';
  const dotClass = isTimeout ? 'bg-yellow-500 animate-pulse' : 'bg-red-500';
  const textClass = isTimeout ? 'text-yellow-700' : 'text-red-600';
  const messageClass = isTimeout ? 'text-yellow-700' : 'text-gray-600';

  return (
    <div className={`absolute top-4 left-4 rounded-lg shadow-lg p-4 z-10 max-w-xs ${bgClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${dotClass}`}></div>
        <span className={`text-sm font-semibold ${textClass}`}>
          {isTimeout ? 'Acquiring Location' : 'Location Error'}
        </span>
      </div>
      <p className={`text-xs mb-3 ${messageClass}`}>{getErrorMessage(error)}</p>
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

// Sub-component: Waiting state panel
function WaitingPanel({
  isTracking,
  onRequestPermission,
}: {
  readonly isTracking: boolean;
  readonly onRequestPermission?: () => void;
}) {
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Requesting location...</span>
      </div>
      <p className="text-xs text-gray-500">
        {isTracking ? 'Waiting for GPS signal...' : 'Please allow location access when prompted.'}
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

// Sub-component: Position detail row
function PositionDetail({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <span className="text-gray-600 text-xs">{label}:</span>
      <p className="text-xs">{value}</p>
    </div>
  );
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
    return <ErrorPanel error={error} onRequestPermission={onRequestPermission} />;
  }

  // Show waiting state
  if (!position) {
    return <WaitingPanel isTracking={isTracking} onRequestPermission={onRequestPermission} />;
  }

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          ></div>
          <span className="text-sm font-semibold">
            {isTracking ? 'Live Location' : 'Location'}
          </span>
        </div>
        {onCenterMap && (
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
          <PositionDetail label="Accuracy" value={formatDistance(position.accuracy)} />
        )}

        {position.speed != null && position.speed > 0 && (
          <PositionDetail label="Speed" value={`${(position.speed * 3.6).toFixed(1)} km/h`} />
        )}

        {position.heading != null && (
          <PositionDetail label="Heading" value={`${Math.round(position.heading)}°`} />
        )}

        {position.altitude != null && (
          <PositionDetail label="Altitude" value={`${Math.round(position.altitude)}m`} />
        )}

        <div className="pt-2 border-t border-gray-200">
          <span className="text-gray-600 text-xs">Last Update:</span>
          <p className="text-xs">{new Date(position.timestamp).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
