'use client';

export default function DiscoverButton() {
  return (
    <button
      className="absolute top-4 right-4 z-10 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition flex items-center justify-center"
      title="Discover"
      aria-label="Discover"
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
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        <path d="M2 12h20"></path>
      </svg>
    </button>
  );
}

