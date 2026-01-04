'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import mapboxgl from 'mapbox-gl';
import { getMapboxToken } from '@/lib/mapbox';
import { useNavigationContext } from '@/contexts/NavigationContext';

// Dynamically import SearchBox to avoid SSR issues
const SearchBox = dynamic(
  () => import('@mapbox/search-js-react').then((mod) => mod.SearchBox),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    ),
  }
);

interface SearchPanelProps {
  readonly currentLocation: [number, number] | null;
  readonly map: mapboxgl.Map | null;
  readonly onSelectLocation: (coordinates: [number, number], name: string) => void;
}

export default function SearchPanel({ currentLocation, map, onSelectLocation }: SearchPanelProps) {
  const { showSearch, setShowSearch, setNavigationActive } = useNavigationContext();
  const [inputValue, setInputValue] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reset to default mode when panel closes
  useEffect(() => {
    if (!showSearch) {
      setInputValue('');
      setSearchError(null);
      setNavigationActive(false);
    }
  }, [showSearch, setNavigationActive]);

  // Clear error when input changes
  useEffect(() => {
    if (inputValue) {
      setSearchError(null);
    }
  }, [inputValue]);

  const handleRetrieve = (result: any) => {
    // Handle different result structures from Mapbox SearchBox
    let coords: [number, number] | null = null;
    let name = '';

    // Handle FeatureCollection (from /retrieve endpoint)
    if (result?.type === 'FeatureCollection' && result?.features && Array.isArray(result.features) && result.features.length > 0) {
      const feature = result.features[0];
      if (feature?.geometry?.coordinates && Array.isArray(feature.geometry.coordinates)) {
        coords = [
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1],
        ];
        name = feature.properties?.full_address || 
               feature.properties?.name || 
               feature.properties?.place_name || 
               feature.properties?.address_line1 || 
               '';
      }
    }
    // Handle single Feature structure
    else if (result?.geometry?.coordinates && Array.isArray(result.geometry.coordinates)) {
      // Standard GeoJSON Feature structure
      coords = [
        result.geometry.coordinates[0],
        result.geometry.coordinates[1],
      ];
      name = result.properties?.full_address || 
             result.properties?.name || 
             result.properties?.place_name || 
             result.properties?.address_line1 || 
             '';
    } 
    // Handle direct coordinates structure
    else if (result?.coordinates && Array.isArray(result.coordinates)) {
      coords = [result.coordinates[0], result.coordinates[1]];
      name = result.full_address || result.name || result.place_name || '';
    } 
    // Handle center-based structure
    else if (result?.center && Array.isArray(result.center)) {
      coords = [result.center[0], result.center[1]];
      name = result.place_name || result.text || '';
    } 
    // Handle nested feature structure
    else if (result?.feature?.geometry?.coordinates) {
      coords = [
        result.feature.geometry.coordinates[0],
        result.feature.geometry.coordinates[1],
      ];
      name = result.feature.properties?.full_address || 
             result.feature.properties?.name || 
             result.feature.properties?.place_name || 
             '';
    }

    // If no valid coordinates found, show error
    if (!coords) {
      console.warn('Invalid result structure - could not extract coordinates:', result);
      setSearchError('Address not found. Please try a different search term.');
      return;
    }
    
    // Clear any previous error
    setSearchError(null);
    
    // Focus map on selected location
    if (map) {
      map.flyTo({
        center: coords,
        zoom: 16,
        duration: 1000,
      });
    }
    
    // Call the onSelectLocation callback
    onSelectLocation(coords, name);
    
    // Show selected location panel instead of closing
    setInputValue('');
    setShowSearch(false);
    setNavigationActive(false);
  };

  if (!showSearch) return null;

  const token = getMapboxToken();
  if (!token) return null;

  return (
    <div className="fixed inset-0 z-30">
      {/* Search Panel Content - Must be above backdrop */}
      <div
        className="absolute inset-0 flex flex-col animate-slide-up z-20"
      >
        {/* Search Bar with Mapbox SearchBox */}
        <div 
          className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm"
        >
          <button
            onClick={() => {
              setInputValue('');
              setShowSearch(false);
              setNavigationActive(false);
            }}
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
          
          {/* Mapbox SearchBox Component */}
          <div className="flex-1 relative">
            <SearchBox
              accessToken={token}
              map={map || undefined}
              mapboxgl={mapboxgl}
              value={inputValue}
              onChange={(value) => setInputValue(value)}
              onRetrieve={handleRetrieve}
              options={{
                language: 'en',
              }}
              marker={true}
            />
          </div>
        </div>
        
        {/* Error message */}
        {searchError && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm">{searchError}</p>
            </div>
          </div>
        )}

        {/* Quick locations */}
        {!inputValue && (
          <div 
            className="flex-1 overflow-y-auto p-4 bg-white/95 backdrop-blur-sm"
          >
            <p className="text-sm text-gray-500 mb-3">Quick locations</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (currentLocation && map) {
                    // Focus map on location
                    map.flyTo({
                      center: currentLocation,
                      zoom: 16,
                      duration: 1000,
                    });
                    // Reset to default mode
                    setInputValue('');
                    setShowSearch(false);
                    setNavigationActive(false);
                  }
                }}
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
                onClick={() => {
                  if (currentLocation && map) {
                    // Focus map on location
                    map.flyTo({
                      center: currentLocation,
                      zoom: 16,
                      duration: 1000,
                    });
                    // Reset to default mode
                    setInputValue('');
                    setShowSearch(false);
                    setNavigationActive(false);
                  }
                }}
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
      </div>
      
      {/* Semi-transparent backdrop - behind search panel */}
      <div className="absolute inset-0 bg-black/20 z-10" />
    </div>
  );
}
