'use client';

import Link from 'next/link';
import { useTripHistory } from '@/hooks/useTripHistory';

export default function NavigationButtons() {
  const { trips } = useTripHistory();

  return (
    <div className="absolute right-4 z-10 flex flex-row gap-2" style={{ bottom: 'calc(1rem + 20px)' }}>
      {/* Trip History Button */}
      <Link
        href="/history"
        className="bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition flex items-center justify-center"
        title="Trip History"
        aria-label="View trip history"
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
          className="text-gray-700"
        >
          <path d="M3 3h18v18H3zM9 9h6v6H9z"></path>
          <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M1 15h6M17 9h6M17 15h6"></path>
        </svg>
      </Link>

      {/* Start Recording Button */}
      <button
        onClick={() => {
          // This will be handled by the trip recording logic
          const event = new CustomEvent('startRecording');
          window.dispatchEvent(event);
        }}
        className="bg-green-500 rounded-full shadow-lg p-3 hover:bg-green-600 transition flex items-center justify-center"
        title="Start Recording Trip"
        aria-label="Start recording trip"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="white"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6" fill="white"></circle>
        </svg>
      </button>

      {/* Settings/More Button */}
      <button
        className="bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition flex items-center justify-center"
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
          className="text-gray-700"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m0 0l-4.243-4.243m4.243 4.243L12 12m4.243 4.243l4.243-4.243"></path>
        </svg>
      </button>
    </div>
  );
}

