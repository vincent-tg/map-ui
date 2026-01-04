'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirectionsControl from '@/components/Map/MapboxDirectionsControl';
import StepInstructions from '@/components/Navigation/StepInstructions';
import { formatDistance, formatDuration } from '@/lib/location';
import { logRouteRequest } from '@/lib/analytics';
import { NavigationStep, NavigationRoute } from '@/types';
import { useNavigationContext } from '@/contexts/NavigationContext';

// Helper function to extract distance and duration from route object
function extractDistanceDuration(route: any): { distance: number; duration: number } {
  if (route?.distance !== undefined && route?.duration !== undefined) {
    return { distance: route.distance, duration: route.duration };
  }
  if (route?.legs && Array.isArray(route.legs) && route.legs.length > 0) {
    const leg = route.legs[0];
    return { distance: leg.distance || 0, duration: leg.duration || 0 };
  }
  return { distance: 0, duration: 0 };
}

// Helper function to extract steps from route object
function extractSteps(route: any): NavigationStep[] {
  if (!route?.legs || !Array.isArray(route.legs) || route.legs.length === 0) {
    return [];
  }
  const leg = route.legs[0];
  if (!leg.steps || !Array.isArray(leg.steps)) {
    return [];
  }
  return leg.steps.map((step: any) => ({
    distance: step.distance || 0,
    duration: step.duration || 0,
    instruction: step.maneuver?.instruction || '',
    maneuver: {
      type: step.maneuver?.type || 'turn',
      modifier: step.maneuver?.modifier,
      location: step.maneuver?.location || [0, 0],
    },
  }));
}

interface SelectedLocationPanelProps {
  readonly map: mapboxgl.Map | null;
  readonly coordinates: [number, number] | null;
  readonly name: string;
  readonly currentLocation: [number, number] | null;
  readonly onStart: () => void;
  readonly onExit: () => void;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  steps: NavigationStep[];
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

export default function SelectedLocationPanel({
  map,
  coordinates,
  name,
  currentLocation,
  onStart,
  onExit,
}: SelectedLocationPanelProps) {
  const { setPreviewRoute, startActiveNavigation } = useNavigationContext();
  
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Static origin - captured once when panel opens or destination changes
  // This prevents route recalculation when user's live location updates
  const [staticOrigin, setStaticOrigin] = useState<[number, number] | null>(null);
  
  // Refs to access current values in callbacks
  const staticOriginRef = useRef(staticOrigin);
  const coordinatesRef = useRef(coordinates);
  const nameRef = useRef(name);
  const routeInfoRef = useRef(routeInfo);
  
  // Keep refs in sync
  useEffect(() => {
    staticOriginRef.current = staticOrigin;
    coordinatesRef.current = coordinates;
    nameRef.current = name;
    routeInfoRef.current = routeInfo;
  }, [staticOrigin, coordinates, name, routeInfo]);

  const handleRouteChange = useCallback((route: any) => {
    console.log('Route received in SelectedLocationPanel:', route);
    
    const { distance, duration } = extractDistanceDuration(route);
    const steps = extractSteps(route);
    
    // Extract geometry from route
    let geometry = route?.geometry;
    if (!geometry && route?.legs?.[0]?.steps) {
      // Build geometry from steps if not directly available
      const coords: [number, number][] = [];
      for (const step of route.legs[0].steps) {
        if (step.geometry?.coordinates) {
          coords.push(...step.geometry.coordinates);
        } else if (step.maneuver?.location) {
          coords.push(step.maneuver.location);
        }
      }
      geometry = { type: 'LineString', coordinates: coords };
    }
    
    console.log('Extracted route data:', { distance, duration, stepsCount: steps.length, hasGeometry: !!geometry });
    
    // Accept route if we have valid distance (duration can be 0 for very short routes)
    if (distance > 0 && geometry?.coordinates) {
      const finalDuration = duration || 0;
      const routeData: RouteInfo = { 
        distance, 
        duration: finalDuration, 
        steps,
        geometry: geometry as { type: string; coordinates: [number, number][] },
      };
      setRouteInfo(routeData);
      setIsCalculating(false);
      setError(null);
      
      // Log route request for analytics
      if (staticOriginRef.current && coordinatesRef.current) {
        logRouteRequest(
          staticOriginRef.current,
          coordinatesRef.current,
          nameRef.current || 'Unknown Location',
          { distance, duration: finalDuration }
        );
      }
      
      console.log('Route info set successfully:', { distance, duration: finalDuration, stepsCount: steps.length });
    } else {
      console.warn('Route data incomplete or invalid');
      setIsCalculating(false);
      setError('Unable to extract route information');
    }
  }, []);

  const handleDirectionsError = useCallback((err: Error) => {
    console.error('Directions error in SelectedLocationPanel:', err);
    setError(err.message);
    setIsCalculating(false);
  }, []);

  // Add marker to map when location is selected
  useEffect(() => {
    if (!map || !coordinates) return;

    // Remove existing marker if any
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create marker
    const el = document.createElement('div');
    el.className = 'selected-location-marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';

    markerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat(coordinates)
      .addTo(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, coordinates]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('SelectedLocationPanel state:', { routeInfo, isCalculating, error, hasCoordinates: !!coordinates, hasStaticOrigin: !!staticOrigin });
  }, [routeInfo, isCalculating, error, coordinates, staticOrigin]);

  // Track the last coordinates to detect changes
  const lastCoordinatesRef = useRef<[number, number] | null>(null);

  // Reset and capture origin when destination changes
  useEffect(() => {
    // Check if coordinates actually changed (not just a re-render)
    const coordsChanged = !lastCoordinatesRef.current || 
      !coordinates ||
      lastCoordinatesRef.current[0] !== coordinates[0] || 
      lastCoordinatesRef.current[1] !== coordinates[1];
    
    if (coordinates && coordsChanged) {
      lastCoordinatesRef.current = coordinates;
      
      // Reset state for new destination
      setRouteInfo(null);
      setError(null);
      setIsCalculating(true);
      
      // Immediately capture origin if currentLocation is available
      if (currentLocation) {
        console.log('Capturing static origin immediately:', currentLocation);
        setStaticOrigin(currentLocation);
      } else {
        // If no current location yet, set to null and wait
        setStaticOrigin(null);
      }
      
      // Timeout fallback - if route doesn't come within 15 seconds, show error with retry
      const timeout = setTimeout(() => {
        // Only timeout if still calculating and no route
        if (!routeInfoRef.current) {
          console.warn('Route calculation timeout');
          setIsCalculating(false);
          setError('Route calculation timed out. Tap "Retry" to try again.');
        }
      }, 15000);
      
      return () => {
        clearTimeout(timeout);
      };
    } else if (!coordinates) {
      // Reset if destination is cleared
      lastCoordinatesRef.current = null;
      setStaticOrigin(null);
      setIsCalculating(false);
      setRouteInfo(null);
      setError(null);
    }
  }, [coordinates, currentLocation]);

  // Capture static origin when currentLocation becomes available (if not already set)
  useEffect(() => {
    if (coordinates && currentLocation && !staticOrigin) {
      console.log('Capturing static origin (delayed):', currentLocation);
      setStaticOrigin(currentLocation);
    }
  }, [coordinates, currentLocation, staticOrigin]);

  // Retry route calculation
  const handleRetry = useCallback(() => {
    if (coordinates && currentLocation) {
      setError(null);
      setIsCalculating(true);
      setRouteInfo(null);
      // Force recapture of static origin
      setStaticOrigin(currentLocation);
    }
  }, [coordinates, currentLocation]);

  const handleStart = () => {
    if (routeInfo && staticOrigin && coordinates) {
      // Create NavigationRoute from routeInfo
      const navigationRoute: NavigationRoute = {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        geometry: routeInfo.geometry,
        steps: routeInfo.steps,
      };
      
      // Store route in navigation context
      setPreviewRoute(
        navigationRoute,
        { coordinates, name: name || 'Destination' },
        staticOrigin
      );
      
      // Start active navigation
      startActiveNavigation();
      
      // Call parent's onStart callback
      onStart();
    }
  };

  const handleExit = () => {
    setRouteInfo(null);
    setIsCalculating(false);
    setError(null);
    onExit();
  };

  if (!coordinates) return null;

  return (
    <>
      {/* MapboxDirections Control - handles route calculation and display */}
      {/* Uses staticOrigin (captured once) instead of dynamic currentLocation */}
      {map && staticOrigin && coordinates && (
        <MapboxDirectionsControl
          map={map}
          origin={staticOrigin}
          destination={coordinates}
          onRouteChange={handleRouteChange}
          onError={handleDirectionsError}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white" style={{ height: '45%' }}>
        {/* Selected Location Information - Top Section */}
        <div className="border border-gray-300 bg-white px-4 py-3 flex-shrink-0">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 mb-1">Selected Location Information</p>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{name || 'Selected Location'}</h3>
            <p className="text-xs text-gray-600 mb-2">
              {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
            </p>
            
            {/* Route Information */}
            {isCalculating && !routeInfo && !staticOrigin && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Getting your location...</span>
              </div>
            )}
            
            {isCalculating && !routeInfo && staticOrigin && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Calculating route...</span>
              </div>
            )}
            
            {routeInfo && (
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">{formatDuration(routeInfo.duration)}</span>
                </div>
              </div>
            )}
            
            {error && !isCalculating && (
              <div className="mt-2">
                <p className="text-xs text-red-600 mb-2">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-step directions - Middle Section (scrollable) */}
        {routeInfo && routeInfo.steps.length > 0 && (
          <div className="flex-1 overflow-hidden px-4 py-2 min-h-0">
            <StepInstructions
              steps={routeInfo.steps}
              collapsible={true}
              maxHeight="calc(100% - 8px)"
            />
          </div>
        )}

        {/* Spacer when no steps available */}
        {(!routeInfo || routeInfo.steps.length === 0) && (
          <div className="flex-1" />
        )}

        {/* Start and Exit Buttons - Bottom Section */}
        <div className="bg-white px-4 py-3 flex gap-3 border-t border-gray-300 flex-shrink-0">
          <button
            onClick={handleStart}
            disabled={!routeInfo || isCalculating}
            className="flex-1 border border-gray-400 bg-white text-gray-900 px-4 py-3 rounded-none font-medium hover:bg-gray-50 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start
          </button>
          <button
            onClick={handleExit}
            className="flex-1 border border-gray-400 bg-white text-gray-900 px-4 py-3 rounded-none font-medium hover:bg-gray-50 transition text-sm"
          >
            Exit
          </button>
        </div>
      </div>
    </>
  );
}

