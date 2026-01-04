'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useNavigation } from '@/hooks/useNavigation';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { formatDistance, formatDuration } from '@/lib/location';
import StepInstructions from '@/components/Navigation/StepInstructions';

interface NavigationControlsProps {
  map: mapboxgl.Map | null;
  currentLocation: [number, number] | null;
}

export default function NavigationControls({
  map,
  currentLocation,
}: NavigationControlsProps) {
  const routeLayerRef = useRef<string | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [destination, setDestination] = useState<string>('');
  const { showSearch, selectedLocation } = useNavigationContext();

  const {
    route,
    isActive,
    isCalculating,
    error,
    currentStepIndex,
    calculateRouteToDestination,
    startNavigation,
    stopNavigation,
    getCurrentInstructionText,
    getRemainingInfo,
    clearRoute,
  } = useNavigation();

  // Initialize geocoder - DISABLED: SearchPanel handles search now
  // The geocoder is no longer added to the map when showSearch is true
  // Search functionality is handled by SearchPanel component

  // Draw route on map
  useEffect(() => {
    if (!map || !route) return;

    const sourceId = 'route';
    const layerId = 'route-line';

    // Remove existing route if any
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Add route source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: route.geometry,
        properties: {},
      },
    });

    // Add route layer
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.75,
      },
    });

    routeLayerRef.current = layerId;

    // Fit map to route bounds
    const coordinates = route.geometry.coordinates;
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
    );

    map.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });

    return () => {
      if (routeLayerRef.current && map.getLayer(routeLayerRef.current)) {
        map.removeLayer(routeLayerRef.current);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, route]);

  const handleStartNavigation = () => {
    if (route) {
      startNavigation();
    }
  };

  const handleStopNavigation = () => {
    stopNavigation();
    clearRoute();
    setDestination('');
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  };

  const remainingInfo = getRemainingInfo();
  const currentInstruction = getCurrentInstructionText();

  // Hide UI panel when location is selected (SelectedLocationPanel shows route info instead)
  // But still draw the route on the map
  const showNavigationPanel = route && !selectedLocation;

  if (!route && !isCalculating) return null;

  return (
    <>
      {/* Navigation Panel - Google Maps style - Only show when no location is selected */}
      {showNavigationPanel && (
        <div className="absolute left-4 right-4 z-10" style={{ bottom: 'calc(33.33% + 1rem)' }}>
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-full">
            {isActive ? (
              // Active Navigation View
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900 mb-1">
                      {currentInstruction || 'Continue straight'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatDistance(remainingInfo.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(remainingInfo.duration)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleStopNavigation}
                    className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                  >
                    End
                  </button>
                </div>
                
                {/* Step-by-step instructions during active navigation */}
                {route.steps && route.steps.length > 0 && (
                  <StepInstructions
                    steps={route.steps}
                    currentStepIndex={currentStepIndex}
                    collapsible={true}
                    maxHeight="150px"
                  />
                )}
              </div>
            ) : (
              // Route Preview View
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Route to destination</h3>
                    <p className="text-sm text-gray-600 mt-1">{destination}</p>
                  </div>
                  <button
                    onClick={handleStopNavigation}
                    className="ml-4 px-3 py-2 text-gray-600 hover:text-gray-900 transition"
                    title="Clear route"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span className="font-semibold">{formatDistance(remainingInfo.distance)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span className="font-semibold">{formatDuration(remainingInfo.duration)}</span>
                  </div>
                </div>

                <button
                  onClick={handleStartNavigation}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-lg"
                >
                  Start Navigation
                </button>

                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isCalculating && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-600">Calculating route...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

