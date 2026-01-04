'use client';

import { LocationPoint } from '@/types';

interface SpeedButtonProps {
  position: LocationPoint | null;
}

export default function SpeedButton({ position }: SpeedButtonProps) {
  const speed = position?.speed 
    ? (position.speed * 3.6).toFixed(0) // Convert m/s to km/h
    : '0';

  return (
    <button
      className="absolute bottom-4 left-4 z-10 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition flex flex-col items-center justify-center min-w-[60px]"
      title="Current Speed"
      aria-label="Current Speed"
    >
      <span className="text-lg font-bold text-gray-900">{speed}</span>
      <span className="text-xs text-gray-600">km/h</span>
    </button>
  );
}

