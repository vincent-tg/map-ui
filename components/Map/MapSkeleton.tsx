'use client';

export default function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-gray-100 animate-pulse">
      {/* Map placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
        {/* Simulated map grid lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="border border-gray-300" />
            ))}
          </div>
        </div>
        
        {/* Center loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Outer ring */}
              <div className="w-12 h-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
              {/* Inner dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading map...</p>
          </div>
        </div>
      </div>
      
      {/* Simulated control placeholders */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="w-10 h-10 bg-white rounded-lg shadow-md" />
        <div className="w-10 h-10 bg-white rounded-lg shadow-md" />
      </div>
    </div>
  );
}

