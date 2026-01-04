'use client';

import { useState } from 'react';
import { useNavigationContext } from '@/contexts/NavigationContext';

export default function ActionBar() {
  const { setShowSearch, setNavigationActive } = useNavigationContext();

  const handleSearchClick = () => {
    setShowSearch(true);
    setNavigationActive(true);
  };

  const handleQuickLocation = (location: string) => {
    // Handle quick location selection (Home, Work, etc.)
    console.log('Selected location:', location);
  };

  return (
    <div className="w-full h-full bg-white border-t border-gray-200 shadow-lg overflow-y-auto">
      <div className="flex flex-col p-4 space-y-3 h-full">
        {/* Search Input Bar */}
        <div className="relative">
          <button
            onClick={handleSearchClick}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-left"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span className="flex-1 text-gray-500">Where to?</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            </svg>
          </button>
        </div>

        {/* Quick Location Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickLocation('home')}
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
          >
            Home
          </button>
          <button
            onClick={() => handleQuickLocation('work')}
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
          >
            Work
          </button>
          <button
            onClick={() => handleQuickLocation('new')}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
          >
            +New
          </button>
        </div>

        {/* Location Card */}
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Nhà riêng (title)</p>
            <p className="text-xs text-gray-500 truncate">Đường ABC, HCM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

