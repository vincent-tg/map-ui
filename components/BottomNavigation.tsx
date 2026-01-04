'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useNavigationContext } from '@/contexts/NavigationContext';

export default function BottomNavigation() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'navigation' | 'settings'>('navigation');
  const { setNavigationActive, setShowSearch } = useNavigationContext();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16 px-4">
        {/* Discovery Button */}
        <button
          onClick={() => {
            setActiveTab('discovery');
            setNavigationActive(false);
            setShowSearch(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${
            activeTab === 'discovery'
              ? 'text-blue-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Discovery"
          aria-label="Discovery"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            <path d="M2 12h20"></path>
          </svg>
          <span className="text-xs font-medium">Discovery</span>
        </button>

        {/* Navigation Control Button */}
        <button
          onClick={() => {
            setActiveTab('navigation');
            setNavigationActive(true);
            setShowSearch(true);
            // Focus search after a short delay to ensure it's rendered
            setTimeout(() => {
              const searchInput = document.querySelector('.mapboxgl-ctrl-geocoder input') as HTMLInputElement;
              if (searchInput) {
                searchInput.focus();
              }
            }, 100);
          }}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${
            activeTab === 'navigation'
              ? 'text-blue-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Navigation Control"
          aria-label="Navigation Control"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <span className="text-xs font-medium">Navigation</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            setActiveTab('settings');
            setNavigationActive(false);
            setShowSearch(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${
            activeTab === 'settings'
              ? 'text-blue-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span className="text-xs font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}

