'use client';

import { LocationPoint } from '@/types';

interface CenterLocationButtonProps {
  position: LocationPoint | null;
  onCenterMap: () => void;
}

export default function CenterLocationButton({
  position,
  onCenterMap,
}: CenterLocationButtonProps) {
  if (!position) return null;

  return (
    <button
      onClick={onCenterMap}
      className="absolute bottom-4 left-4 z-10 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition flex items-center justify-center"
      title="Center map on your location"
      aria-label="Center map on your location"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4285f4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
  );
}

