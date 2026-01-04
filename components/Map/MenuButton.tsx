'use client';

export default function MenuButton() {
  return (
    <button
      className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg px-4 py-2 hover:bg-gray-50 transition flex items-center gap-2"
      title="Menu"
      aria-label="Menu"
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
        className="text-gray-700"
      >
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span className="text-sm font-medium text-gray-700">Menu</span>
    </button>
  );
}

