'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import MapSkeleton from '@/components/Map/MapSkeleton';
import LocationTracker from '@/components/Map/LocationTracker';

// Dynamic import for MapboxMap to prevent SSR hydration errors
const MapboxMap = dynamic(
  () => import('@/components/Map/MapboxMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
);
import NavigationControls from '@/components/Map/NavigationControls';
import CenterLocationButton from '@/components/Map/CenterLocationButton';
import TripRecordingButton from '@/components/Map/TripRecordingButton';
import MenuButton from '@/components/Map/MenuButton';
import DiscoverButton from '@/components/Map/DiscoverButton';
import SpeedButton from '@/components/Map/SpeedButton';
import ActionBar from '@/components/ActionBar';
import SearchPanel from '@/components/SearchPanel';
import SelectedLocationPanel from '@/components/SelectedLocationPanel';
import ActiveNavigationView from '@/components/Navigation/ActiveNavigationView';
import { useMap } from '@/contexts/MapContext';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { useTripHistory } from '@/hooks/useTripHistory';
import { LocationPoint, Trip } from '@/types';
import mapboxgl from 'mapbox-gl';

// Helper to parse coordinates from URL param (format: "lat,lng")
function parseCoordParam(param: string | null): [number, number] | null {
  if (!param) return null;
  const parts = param.split(',');
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lng, lat]; // Return as [lng, lat] for Mapbox
}

// Helper to format coordinates for URL param (format: "lat,lng")
function formatCoordParam(coords: [number, number]): string {
  return `${coords[1].toFixed(6)},${coords[0].toFixed(6)}`; // coords is [lng, lat], format as lat,lng
}

export default function Home() {
  const { map } = useMap();
  const { selectedLocation, setSelectedLocation, navigationState } = useNavigationContext();
  const isActiveNavigation = navigationState.mode === 'active';
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripLayerId, setTripLayerId] = useState<string | null>(null);
  const { addLocationToCurrentTrip } = useTripHistory();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get position from LocationTracker instead of duplicating useGeolocation
  const [position, setPosition] = useState<LocationPoint | null>(null);
  
  // Track if we've restored from URL to prevent re-triggering
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false);

  // Restore route from URL parameters on mount
  useEffect(() => {
    if (hasRestoredFromUrl) return;
    
    const endParam = searchParams.get('end');
    const nameParam = searchParams.get('name');
    
    if (endParam) {
      const endCoords = parseCoordParam(endParam);
      if (endCoords) {
        // Restore destination from URL
        setSelectedLocation({
          coordinates: endCoords,
          name: nameParam ? decodeURIComponent(nameParam) : 'Shared Location',
        });
        setHasRestoredFromUrl(true);
      }
    }
  }, [searchParams, hasRestoredFromUrl, setSelectedLocation]);

  // Update URL when route is set
  const updateUrlParams = useCallback((
    startCoords: [number, number] | null,
    endCoords: [number, number] | null,
    locationName: string | null
  ) => {
    const params = new URLSearchParams();
    
    if (startCoords) {
      params.set('start', formatCoordParam(startCoords));
    }
    if (endCoords) {
      params.set('end', formatCoordParam(endCoords));
    }
    if (locationName) {
      params.set('name', encodeURIComponent(locationName));
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/';
    
    // Use replace to avoid adding to browser history for every location change
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Sync URL with selected location
  useEffect(() => {
    if (selectedLocation && position) {
      updateUrlParams(
        [position.longitude, position.latitude],
        selectedLocation.coordinates,
        selectedLocation.name
      );
    } else if (!selectedLocation) {
      // Clear URL params when no location is selected
      router.replace('/', { scroll: false });
    }
  }, [selectedLocation, position, updateUrlParams, router]);

  // Trigger map resize when selectedLocation changes
  useEffect(() => {
    if (map) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        map.resize();
      }, 100);
    }
  }, [map, selectedLocation]);

  // Load selected trip from sessionStorage (client-side only)
  useEffect(() => {
    if (globalThis.window) {
      const tripData = globalThis.window.sessionStorage.getItem('selectedTrip');
      if (tripData) {
        try {
          const trip = JSON.parse(tripData);
          setSelectedTrip(trip);
          globalThis.window.sessionStorage.removeItem('selectedTrip');
        } catch (error) {
          console.error('Error parsing selected trip:', error);
        }
      }
    }
  }, []);

  const handleLocationUpdate = (location: LocationPoint) => {
    setPosition(location);
    addLocationToCurrentTrip(location);
  };

  const handleCenterMap = () => {
    if (map && position) {
      map.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 16, // Optimal zoom for location tracking
        duration: 1000,
      });
    }
  };

  const handleSelectLocation = (coordinates: [number, number], name: string) => {
    // Set selected location to show the SelectedLocationPanel
    setSelectedLocation({ coordinates, name });
  };

  const handleStartNavigation = () => {
    // Navigation is now handled by the NavigationContext
    // The SelectedLocationPanel's handleStart calls startActiveNavigation()
    // which sets the navigation mode to 'active'
    console.log('Navigation started to:', selectedLocation);
    // Note: setSelectedLocation(null) is called by startActiveNavigation in the context
  };

  const handleExitSelection = () => {
    // Close selected location panel and return to map
    setSelectedLocation(null);
  };

  // Draw selected trip on map
  useEffect(() => {
    if (!map || !selectedTrip) return;

    const sourceId = 'selected-trip';
    const layerId = 'selected-trip-line';

    // Remove existing trip if any
    if (tripLayerId && map.getLayer(tripLayerId)) {
      map.removeLayer(tripLayerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Create line from trip locations
    const coordinates = selectedTrip.locations.map(
      (loc) => [loc.longitude, loc.latitude] as [number, number]
    );

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {},
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#10b981',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    setTripLayerId(layerId);

    // Fit map to trip bounds
    if (coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );

      map.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      });
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, selectedTrip, tripLayerId]);

  // Determine map height based on current state
  const getMapHeight = () => {
    if (isActiveNavigation) return '100%'; // Full screen during navigation
    if (selectedLocation) return '55%';
    return '66.67%';
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-white overflow-hidden">
      {/* Map Section - Adjust height based on navigation/selection state */}
      <div 
        className="relative w-full flex-shrink-0" 
        style={{ 
          height: getMapHeight(),
          minHeight: 0,
          maxHeight: getMapHeight()
        }}
      >
        <MapboxMap>
          {map && (
            <>
              <LocationTracker
                map={map}
                onLocationUpdate={handleLocationUpdate}
                followUser={!selectedTrip && !selectedLocation && !isActiveNavigation}
                showPath={!isActiveNavigation}
              />
              {/* Hide NavigationControls during active navigation - ActiveNavigationView handles it */}
              {!isActiveNavigation && (
                <NavigationControls
                  map={map}
                  currentLocation={
                    position
                      ? [position.longitude, position.latitude]
                      : null
                  }
                />
              )}
              {/* Hide control buttons during active navigation */}
              {!isActiveNavigation && (
                <>
                  <CenterLocationButton
                    position={position}
                    onCenterMap={handleCenterMap}
                  />
                  <TripRecordingButton />
                  <MenuButton />
                  <DiscoverButton />
                  <SpeedButton position={position} />
                </>
              )}
              {/* Active Navigation View - shows turn-by-turn UI */}
              {isActiveNavigation && (
                <ActiveNavigationView
                  map={map}
                  currentLocation={position}
                />
              )}
            </>
          )}
        </MapboxMap>
      </div>

      {/* Action Bar - Hide when location is selected or during navigation */}
      {!selectedLocation && !isActiveNavigation && (
        <div className="flex-shrink-0" style={{ height: '33.33%' }}>
          <ActionBar />
        </div>
      )}

      {/* Search Panel - Hide during active navigation */}
      {!isActiveNavigation && (
        <SearchPanel
          currentLocation={
            position
              ? [position.longitude, position.latitude]
              : null
          }
          map={map}
          onSelectLocation={handleSelectLocation}
        />
      )}

      {/* Selected Location Panel */}
      {selectedLocation && !isActiveNavigation && (
        <SelectedLocationPanel
          map={map}
          coordinates={selectedLocation.coordinates}
          name={selectedLocation.name}
          currentLocation={
            position
              ? [position.longitude, position.latitude]
              : null
          }
          onStart={handleStartNavigation}
          onExit={handleExitSelection}
        />
      )}
    </div>
  );
}
