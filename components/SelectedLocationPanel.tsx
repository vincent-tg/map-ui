'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirectionsControl from '@/components/Map/MapboxDirectionsControl';
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
  const { startActiveNavigation } = useNavigationContext();
  
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

    // Use Mapbox's default marker with red color
    markerRef.current = new mapboxgl.Marker({
      color: '#EA4335', // Red color like Google Maps
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

  // Draw route line on map when routeInfo is available
  useEffect(() => {
    if (!map || !routeInfo?.geometry?.coordinates) return;

    const sourceId = 'selected-route-source';
    const layerId = 'selected-route-layer';
    const outlineLayerId = 'selected-route-outline';

    // Wait for map style to be loaded
    const addRoute = () => {
      // Remove existing route layers/sources if any
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getLayer(outlineLayerId)) {
        map.removeLayer(outlineLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Add route source
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: routeInfo.geometry.coordinates,
          },
        },
      });

      // Add route outline (for better visibility)
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1a73e8',
          'line-width': 8,
          'line-opacity': 0.4,
        },
      });

      // Add route line
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#4285f4',
          'line-width': 5,
          'line-opacity': 1,
        },
      });

      // Fit map to show the entire route
      if (routeInfo.geometry.coordinates.length > 0) {
        const bounds = routeInfo.geometry.coordinates.reduce(
          (bounds, coord) => bounds.extend(coord),
          new mapboxgl.LngLatBounds(
            routeInfo.geometry.coordinates[0],
            routeInfo.geometry.coordinates[0]
          )
        );

        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 150, left: 50, right: 50 },
          duration: 500,
        });
      }
    };

    if (map.isStyleLoaded()) {
      addRoute();
    } else {
      map.once('styledata', addRoute);
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getLayer(outlineLayerId)) {
        map.removeLayer(outlineLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, routeInfo]);

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
      
      const destination = { coordinates, name: name || 'Destination' };
      
      // Switch to 3D navigation view
      if (map) {
        map.easeTo({
          center: staticOrigin,
          zoom: 17,
          pitch: 60, // Tilted 3D view
          bearing: 0, // Will be updated by ActiveNavigationView based on heading
          duration: 800,
        });
      }
      
      // Start active navigation with route data directly (avoids race condition)
      startActiveNavigation({
        route: navigationRoute,
        destination,
        origin: staticOrigin,
      });
      
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

      {/* Minimal bottom bar - just shows route info and actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg border-t border-gray-200">
        <div className="px-4 py-3">
          {/* Destination name and route info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{name || 'Selected Location'}</h3>
              {routeInfo && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-600">{formatDistance(routeInfo.distance)}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{formatDuration(routeInfo.duration)}</span>
                </div>
              )}
              {isCalculating && !routeInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-500">
                    {staticOrigin ? 'Calculating route...' : 'Getting location...'}
                  </span>
                </div>
              )}
              {error && !isCalculating && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-red-600">{error}</span>
                  <button
                    onClick={handleRetry}
                    className="text-sm text-blue-600 font-medium hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={!routeInfo || isCalculating}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </button>
            <button
              onClick={handleExit}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-sm"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

