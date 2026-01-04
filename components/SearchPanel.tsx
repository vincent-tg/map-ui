'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { getMapboxToken } from '@/lib/mapbox';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { useNavigation } from '@/hooks/useNavigation';
import { formatDistance } from '@/lib/location';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  distance?: number;
}

interface SearchPanelProps {
  readonly currentLocation: [number, number] | null;
  readonly map: mapboxgl.Map | null;
  readonly onSelectLocation: (coordinates: [number, number], name: string) => void;
}

export default function SearchPanel({ currentLocation, map, onSelectLocation }: SearchPanelProps) {
  const { showSearch, setShowSearch } = useNavigationContext();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const geocoderContainerRef = useRef<HTMLDivElement>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const { calculateRouteToDestination } = useNavigation();

  // Initialize Mapbox Geocoder
  useEffect(() => {
    if (!map || !showSearch || !geocoderContainerRef.current) return;

    const token = getMapboxToken();
    if (!token) return;

    // Don't create if already exists
    if (geocoderRef.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: token,
      mapboxgl: mapboxgl,
      placeholder: 'Where to?',
      marker: false,
      types: 'address,poi,place',
      countries: undefined,
    });

    // Add geocoder to container
    const geocoderElement = geocoder.onAdd(map);
    
    // Style the geocoder element
    if (geocoderElement) {
      geocoderElement.style.position = 'relative';
      geocoderElement.style.width = '100%';
      geocoderElement.style.minWidth = '0';
      
      const input = geocoderElement.querySelector('input');
      if (input) {
        input.style.width = '100%';
        input.style.padding = '0.75rem 2.5rem 0.75rem 2.75rem';
        input.style.fontSize = '1rem';
        input.style.border = '2px solid #d1d5db';
        input.style.borderRadius = '0.5rem';
        input.style.backgroundColor = '#ffffff';
        input.style.color = '#111827';
        input.style.outline = 'none';
        input.style.transition = 'border-color 0.2s, box-shadow 0.2s';
        
        input.addEventListener('focus', () => {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        });
        
        input.addEventListener('blur', () => {
          input.style.borderColor = '#d1d5db';
          input.style.boxShadow = 'none';
        });
      }
      
      geocoderContainerRef.current.appendChild(geocoderElement);
    }

    geocoderRef.current = geocoder;

  }, [map, showSearch, currentLocation, onSelectLocation, calculateRouteToDestination]);

  // Reset when panel closes
  useEffect(() => {
    if (!showSearch) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  }, [showSearch]);

  if (!showSearch) return null;

  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 border-0 p-0 cursor-pointer"
        aria-label="Close search panel"
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        {/* Search Bar with Mapbox Geocoder */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
          <button
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
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
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          {/* Mapbox Geocoder Container */}
          <div className="flex-1" ref={geocoderContainerRef}></div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && hasSearched && (
            <div className="text-center py-8 text-gray-500">
              No results found
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !hasSearched && (
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">Quick locations</p>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Home</p>
                    <p className="text-sm text-gray-500">Your saved home address</p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                      <line x1="15" y1="3" x2="15" y2="21"></line>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Work</p>
                    <p className="text-sm text-gray-500">Your saved work address</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="divide-y divide-gray-100">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{result.name}</p>
                    <p className="text-sm text-gray-500 truncate">{result.address}</p>
                  </div>
                  {result.distance !== undefined && (
                    <div className="flex-shrink-0 text-right">
                      <p className="font-semibold text-gray-900">
                        {formatDistance(result.distance)}
                      </p>
                      <p className="text-xs text-gray-500">away</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
