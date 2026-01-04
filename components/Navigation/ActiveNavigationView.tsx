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
  const rerouteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReroutingRef = useRef(false);

  const { route, destination, currentStepIndex, isOffRoute, isRerouting, remainingDistance, remainingDuration, eta } = navigationState;

  // Handle ending navigation - reset map to 2D and center on current location
  const handleEndNavigation = useCallback(() => {
    // Reset map to 2D view
    if (map && currentLocation) {
      map.easeTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 16,
        bearing: 0,
        pitch: 0,
        duration: 500,
      });
    }
    
    // Call the context's endNavigation to reset state
    endNavigation();
  }, [map, currentLocation, endNavigation]);

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
    // Clear any existing timeout first
    if (rerouteTimeoutRef.current) {
      clearTimeout(rerouteTimeoutRef.current);
      rerouteTimeoutRef.current = null;
    }
    
    // Start rerouting timer if off-route
    if (isOffRoute && !isRerouting && currentLocation) {
      rerouteTimeoutRef.current = setTimeout(() => {
        handleReroute([currentLocation.longitude, currentLocation.latitude]);
      }, 3000);
    }
    
    return () => {
      if (rerouteTimeoutRef.current) {
        clearTimeout(rerouteTimeoutRef.current);
      }
    };
  }, [isOffRoute, isRerouting, currentLocation, handleReroute]);

  // Add 3D buildings and sky layer for navigation
  useEffect(() => {
    if (!map) return;
    // Only add 3D buildings when in active navigation mode
    if (navigationState.mode !== 'active') return;
    
    const buildingsLayerId = 'add-3d-buildings';
    const skyLayerId = 'navigation-sky';
    let isAdded = false;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const add3DLayers = () => {
      if (isAdded) return;
      
      const style = map.getStyle();
      if (!style) {
        retryTimeout = setTimeout(add3DLayers, 100);
        return;
      }
      
      try {
        const layers = style.layers;
        if (!layers || layers.length === 0) {
          retryTimeout = setTimeout(add3DLayers, 100);
          return;
        }
        
        // Hide existing flat building layers first
        for (const layer of layers) {
          if (layer.type === 'fill' && layer.id.includes('building')) {
            try {
              map.setLayoutProperty(layer.id, 'visibility', 'none');
            } catch {
              // Ignore
            }
          }
        }
        
        // Find the first symbol layer to insert 3D buildings below labels
        const labelLayer = layers.find(
          (layer) => layer.type === 'symbol' && (layer.layout as Record<string, unknown>)?.['text-field']
        );
        const labelLayerId = labelLayer?.id;

        // Add 3D buildings layer if not exists
        if (!map.getLayer(buildingsLayerId)) {
          map.addLayer(
            {
              'id': buildingsLayerId,
              'source': 'composite',
              'source-layer': 'building',
              'type': 'fill-extrusion',
              'minzoom': 15,
              'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['coalesce', ['get', 'height'], 10]
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['coalesce', ['get', 'min_height'], 0]
                ],
                'fill-extrusion-opacity': 0.6
              }
            },
            labelLayerId
          );
          isAdded = true;
        }
        
        // Add sky layer for atmosphere effect
        if (!map.getLayer(skyLayerId)) {
          map.addLayer({
            id: skyLayerId,
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0, 90],
              'sky-atmosphere-sun-intensity': 15,
            },
          });
        }
      } catch (error) {
        console.error('Error adding 3D buildings:', error);
      }
    };
    
    // Try immediately since style should be loaded
    add3DLayers();
    
    // Also listen for style.load event in case style reloads
    map.on('style.load', add3DLayers);
    
    // Try on idle as fallback
    const idleHandler = () => add3DLayers();
    map.once('idle', idleHandler);
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      map.off('style.load', add3DLayers);
      map.off('idle', idleHandler);
      
      try {
        // Remove 3D layers
        if (map.getLayer(buildingsLayerId)) {
          map.removeLayer(buildingsLayerId);
        }
        if (map.getLayer(skyLayerId)) {
          map.removeLayer(skyLayerId);
        }
        
        // Restore hidden flat building layers
        const style = map.getStyle();
        if (style?.layers) {
          for (const layer of style.layers) {
            if (layer.type === 'fill' && layer.id.includes('building')) {
              try {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
              } catch {
                // Ignore
              }
            }
          }
        }
      } catch {
        // Map might be removed
      }
    };
  }, [map, navigationState.mode]);

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
        geometry: route.geometry as GeoJSON.Geometry,
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
    if (!route?.steps || route.steps.length === 0) return;

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
        // Arrived! Reset map to 2D and end navigation
        if (map) {
          map.easeTo({
            center: currentPoint,
            zoom: 16,
            bearing: 0,
            pitch: 0,
            duration: 500,
          });
        }
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
    const newDistanceToManeuver = newStepIndex === currentStepIndex
      ? distanceToManeuver
      : route.steps[newStepIndex]?.distance || 0;
      
    updateNavigationProgress(currentPoint, newDistanceToManeuver, newStepIndex);
  }, [map, route, currentStepIndex, destination, isOffRoute, endNavigation, setOffRoute, updateNavigationProgress]);

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
  // Offset the center so user is in the lower third of the screen (to see more of route ahead)
  useEffect(() => {
    if (!map || !currentLocation) return;
    
    const heading = currentLocation.heading || 0;
    const headingRad = (heading * Math.PI) / 180;
    
    // Calculate offset point ahead of user based on heading
    // This moves the visual center north of the user's actual position
    // so the user appears in the lower third of the screen
    const offsetDistance = 0.0015; // Approximately 150-200 meters at zoom 17
    const offsetLat = currentLocation.latitude + offsetDistance * Math.cos(headingRad);
    const offsetLng = currentLocation.longitude + offsetDistance * Math.sin(headingRad);
    
    map.easeTo({
      center: [offsetLng, offsetLat],
      zoom: 17,
      bearing: heading,
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
              onClick={handleEndNavigation}
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

