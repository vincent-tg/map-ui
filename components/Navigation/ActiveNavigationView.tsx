'use client';

import { useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { formatDistance, formatDuration } from '@/lib/location';
import { calculateRoute } from '@/lib/navigation';
import { getMapboxToken } from '@/lib/mapbox';
import NextManeuverCard from './NextManeuverCard';
import { LocationPoint } from '@/types';

interface ActiveNavigationViewProps {
  readonly map: mapboxgl.Map | null;
  readonly currentLocation: LocationPoint | null;
}

// Calculate distance between two points using Haversine formula
function calculateDistanceBetweenPoints(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1[1] * Math.PI) / 180;
  const lat2 = (point2[1] * Math.PI) / 180;
  const deltaLat = ((point2[1] - point1[1]) * Math.PI) / 180;
  const deltaLon = ((point2[0] - point1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate minimum distance from a point to a line segment
function distanceToRouteSegment(
  point: [number, number],
  routeCoordinates: [number, number][]
): number {
  if (routeCoordinates.length < 2) return Infinity;
  
  let minDistance = Infinity;
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const segmentStart = routeCoordinates[i];
    const segmentEnd = routeCoordinates[i + 1];
    
    // Simplified: just check distance to closest endpoint
    const distToStart = calculateDistanceBetweenPoints(point, segmentStart);
    const distToEnd = calculateDistanceBetweenPoints(point, segmentEnd);
    minDistance = Math.min(minDistance, distToStart, distToEnd);
  }
  
  return minDistance;
}

export default function ActiveNavigationView({
  map,
  currentLocation,
}: ActiveNavigationViewProps) {
  const {
    navigationState,
    updateNavigationProgress,
    setOffRoute,
    setRerouting,
    updateRoute,
    endNavigation,
  } = useNavigationContext();
  
  const lastProcessedLocationRef = useRef<LocationPoint | null>(null);
  const routeLayerRef = useRef<string | null>(null);
  const rerouteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReroutingRef = useRef(false);

  const { route, destination, currentStepIndex, isOffRoute, isRerouting, remainingDistance, remainingDuration, eta } = navigationState;

  // Automatic rerouting when off-route
  const handleReroute = useCallback(async (currentPoint: [number, number]) => {
    if (!destination?.coordinates || isReroutingRef.current) return;
    
    isReroutingRef.current = true;
    setRerouting(true);
    
    try {
      const token = getMapboxToken();
      if (!token) {
        console.error('Mapbox token not found for rerouting');
        setRerouting(false);
        isReroutingRef.current = false;
        return;
      }
      
      const newRoute = await calculateRoute(
        {
          origin: currentPoint,
          destination: destination.coordinates,
        },
        token
      );
      
      if (newRoute) {
        updateRoute(newRoute);
        console.log('Rerouted successfully');
      } else {
        console.error('Failed to calculate new route');
      }
    } catch (error) {
      console.error('Rerouting error:', error);
    } finally {
      setRerouting(false);
      isReroutingRef.current = false;
    }
  }, [destination, setRerouting, updateRoute]);

  // Trigger rerouting after being off-route for 3 seconds
  useEffect(() => {
    if (isOffRoute && !isRerouting && currentLocation) {
      // Clear any existing timeout
      if (rerouteTimeoutRef.current) {
        clearTimeout(rerouteTimeoutRef.current);
      }
      
      // Start rerouting after 3 seconds of being off-route
      rerouteTimeoutRef.current = setTimeout(() => {
        handleReroute([currentLocation.longitude, currentLocation.latitude]);
      }, 3000);
    } else {
      // Clear timeout if back on route
      if (rerouteTimeoutRef.current) {
        clearTimeout(rerouteTimeoutRef.current);
        rerouteTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (rerouteTimeoutRef.current) {
        clearTimeout(rerouteTimeoutRef.current);
      }
    };
  }, [isOffRoute, isRerouting, currentLocation, handleReroute]);

  // Draw route on map
  useEffect(() => {
    if (!map || !route) return;

    const sourceId = 'active-navigation-route';
    const layerId = 'active-navigation-route-line';
    const completedLayerId = 'active-navigation-completed-line';

    // Remove existing layers
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getLayer(completedLayerId)) {
      map.removeLayer(completedLayerId);
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

    // Add route layer (remaining)
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
        'line-width': 6,
        'line-opacity': 0.9,
      },
    });

    routeLayerRef.current = layerId;

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getLayer(completedLayerId)) {
        map.removeLayer(completedLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, route]);

  // Process location updates for navigation progress
  const processLocationUpdate = useCallback((location: LocationPoint) => {
    if (!route || !route.steps || route.steps.length === 0) return;

    const currentPoint: [number, number] = [location.longitude, location.latitude];
    
    // Get current step
    const currentStep = route.steps[currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to next maneuver
    const distanceToManeuver = calculateDistanceBetweenPoints(
      currentPoint,
      currentStep.maneuver.location
    );

    // Check if we should advance to next step (within 30m of maneuver point)
    const STEP_ADVANCE_THRESHOLD = 30; // meters
    let newStepIndex = currentStepIndex;
    
    if (distanceToManeuver < STEP_ADVANCE_THRESHOLD && currentStepIndex < route.steps.length - 1) {
      newStepIndex = currentStepIndex + 1;
    }

    // Check if we've arrived (within 30m of destination and at last step)
    const ARRIVAL_THRESHOLD = 30;
    if (
      destination?.coordinates &&
      currentStepIndex >= route.steps.length - 1
    ) {
      const distanceToDestination = calculateDistanceBetweenPoints(
        currentPoint,
        destination.coordinates
      );
      if (distanceToDestination < ARRIVAL_THRESHOLD) {
        // Arrived!
        endNavigation();
        return;
      }
    }

    // Check if off-route (more than 50m from route line)
    const OFF_ROUTE_THRESHOLD = 50;
    const distanceToRoute = distanceToRouteSegment(currentPoint, route.geometry.coordinates);
    const isCurrentlyOffRoute = distanceToRoute > OFF_ROUTE_THRESHOLD;
    
    if (isCurrentlyOffRoute !== isOffRoute) {
      setOffRoute(isCurrentlyOffRoute);
    }

    // Update navigation progress
    const newDistanceToManeuver = newStepIndex !== currentStepIndex
      ? route.steps[newStepIndex]?.distance || 0
      : distanceToManeuver;
      
    updateNavigationProgress(currentPoint, newDistanceToManeuver, newStepIndex);
  }, [route, currentStepIndex, destination, isOffRoute, endNavigation, setOffRoute, updateNavigationProgress]);

  // Watch for location updates
  useEffect(() => {
    if (!currentLocation) return;
    
    // Avoid processing the same location twice
    if (
      lastProcessedLocationRef.current?.timestamp === currentLocation.timestamp &&
      lastProcessedLocationRef.current?.latitude === currentLocation.latitude &&
      lastProcessedLocationRef.current?.longitude === currentLocation.longitude
    ) {
      return;
    }
    
    lastProcessedLocationRef.current = currentLocation;
    processLocationUpdate(currentLocation);
  }, [currentLocation, processLocationUpdate]);

  // Keep map centered on user location during navigation
  useEffect(() => {
    if (!map || !currentLocation) return;
    
    map.easeTo({
      center: [currentLocation.longitude, currentLocation.latitude],
      zoom: 17,
      bearing: currentLocation.heading || 0,
      pitch: 60, // Tilted view for navigation
      duration: 500,
    });
  }, [map, currentLocation]);

  // Don't render if not in active navigation mode
  if (navigationState.mode !== 'active' || !route) {
    return null;
  }

  const currentStep = route.steps[currentStepIndex];
  const nextStep = currentStepIndex < route.steps.length - 1 
    ? route.steps[currentStepIndex + 1] 
    : null;

  // Format ETA
  const formatETA = (etaDate: Date | null): string => {
    if (!etaDate) return '--:--';
    return etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Top: Next Maneuver Card */}
      <div className="absolute top-4 left-4 right-4 z-50">
        {currentStep && (
          <NextManeuverCard
            step={currentStep}
            distanceToManeuver={navigationState.distanceToNextManeuver}
            isNextStep={nextStep}
          />
        )}
        
        {/* Off-route warning */}
        {isOffRoute && !isRerouting && (
          <div className="mt-3 bg-red-500 text-white rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-medium">You are off route</span>
          </div>
        )}
        
        {/* Rerouting indicator */}
        {isRerouting && (
          <div className="mt-3 bg-yellow-500 text-white rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span className="font-medium">Rerouting...</span>
          </div>
        )}
      </div>

      {/* Bottom: Navigation Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-white shadow-2xl safe-area-bottom">
        <div className="px-4 py-3">
          {/* Destination name */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
              <p className="text-sm font-medium text-gray-900 truncate">
                {destination?.name || 'Destination'}
              </p>
            </div>
            <button
              onClick={endNavigation}
              className="flex-shrink-0 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition text-sm"
            >
              End
            </button>
          </div>
          
          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* ETA */}
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatETA(eta)}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">ETA</p>
              </div>
              
              {/* Remaining time */}
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">{formatDuration(remainingDuration)}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
              </div>
              
              {/* Remaining distance */}
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">{formatDistance(remainingDistance)}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Distance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

