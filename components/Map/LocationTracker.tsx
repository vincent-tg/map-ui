'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { LocationPoint } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';

interface LocationTrackerProps {
  map: mapboxgl.Map | null;
  onLocationUpdate?: (location: LocationPoint) => void;
  followUser?: boolean;
  showAccuracyCircle?: boolean;
  showPath?: boolean; // Show movement trail
}

export default function LocationTracker({
  map,
  onLocationUpdate,
  followUser = true,
  showAccuracyCircle = true,
  showPath = true,
}: LocationTrackerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<[number, number][]>([]);
  const hasCenteredRef = useRef(false); // Track if we've centered on first location
  const sourceId = 'user-location';
  const layerId = 'user-location-circle';
  const pathSourceId = 'user-location-path';
  const pathLayerId = 'user-location-path-line';

  const {
    position,
    isTracking,
    startTracking,
    stopTracking,
    error,
  } = useGeolocation({
    onLocationUpdate,
  });

  // Initialize marker
  useEffect(() => {
    if (!map) return;

    // Wait for map to be loaded before adding sources/layers
    const setupMap = () => {
      // Create custom marker element - Google Maps style
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      
      // Outer pulsing circle
      const outerCircle = document.createElement('div');
      outerCircle.style.width = '40px';
      outerCircle.style.height = '40px';
      outerCircle.style.borderRadius = '50%';
      outerCircle.style.backgroundColor = '#4285f4';
      outerCircle.style.opacity = '0.3';
      outerCircle.style.position = 'absolute';
      outerCircle.style.top = '50%';
      outerCircle.style.left = '50%';
      outerCircle.style.transform = 'translate(-50%, -50%)';
      outerCircle.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite';
      
      // Middle circle
      const middleCircle = document.createElement('div');
      middleCircle.style.width = '20px';
      middleCircle.style.height = '20px';
      middleCircle.style.borderRadius = '50%';
      middleCircle.style.backgroundColor = '#4285f4';
      middleCircle.style.opacity = '0.5';
      middleCircle.style.position = 'absolute';
      middleCircle.style.top = '50%';
      middleCircle.style.left = '50%';
      middleCircle.style.transform = 'translate(-50%, -50%)';
      
      // Inner dot (the actual location)
      const innerDot = document.createElement('div');
      innerDot.style.width = '12px';
      innerDot.style.height = '12px';
      innerDot.style.borderRadius = '50%';
      innerDot.style.backgroundColor = '#ffffff';
      innerDot.style.border = '2px solid #4285f4';
      innerDot.style.position = 'absolute';
      innerDot.style.top = '50%';
      innerDot.style.left = '50%';
      innerDot.style.transform = 'translate(-50%, -50%)';
      innerDot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      innerDot.style.zIndex = '3';
      
      // Direction arrow (only shows when heading is available)
      const arrow = document.createElement('div');
      arrow.className = 'heading-arrow';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '6px solid transparent';
      arrow.style.borderRight = '6px solid transparent';
      arrow.style.borderBottom = '16px solid #4285f4';
      arrow.style.position = 'absolute';
      arrow.style.top = '50%';
      arrow.style.left = '50%';
      arrow.style.transform = 'translate(-50%, -50%) translateY(-18px)';
      arrow.style.transformOrigin = 'center bottom';
      arrow.style.opacity = '0';
      arrow.style.transition = 'opacity 0.3s ease, transform 0.3s ease-out';
      arrow.style.zIndex = '2';
      arrowRef.current = arrow;
      
      // Container
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.position = 'relative';
      el.style.cursor = 'pointer';
      el.style.zIndex = '1000';
      
      el.appendChild(outerCircle);
      el.appendChild(middleCircle);
      el.appendChild(arrow);
      el.appendChild(innerDot);

      // Set initial position if available, otherwise use [0, 0] as placeholder
      const initialPosition = position 
        ? [position.longitude, position.latitude] as [number, number]
        : [0, 0] as [number, number];
      
      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      }).setLngLat(initialPosition).addTo(map);

      // Add accuracy circle source and layer
      if (showAccuracyCircle) {
        try {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0],
                },
                properties: {},
              },
            });
          }

          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 0,
                'circle-color': '#4285f4', // Google Maps blue
                'circle-opacity': 0.15,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#4285f4',
                'circle-stroke-opacity': 0.3,
              },
            });
          }

          // Add path source for movement trail
          if (!map.getSource(pathSourceId)) {
            map.addSource(pathSourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [],
                },
                properties: {},
              },
            });
          }

          // Add path layer
          if (!map.getLayer(pathLayerId)) {
            map.addLayer({
              id: pathLayerId,
              type: 'line',
              source: pathSourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#4285f4',
                'line-width': 3,
                'line-opacity': 0.6,
              },
            });
          }
        } catch (error) {
          console.warn('Error initializing accuracy circle:', error);
        }
      }
    };

    if (map.loaded()) {
      setupMap();
    } else {
      map.once('load', setupMap);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map) {
        try {
          // Check if map is still valid before accessing
          if (map.getLayer && map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
          if (map.getSource && map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
          if (map.getLayer && map.getLayer(pathLayerId)) {
            map.removeLayer(pathLayerId);
          }
          if (map.getSource && map.getSource(pathSourceId)) {
            map.removeSource(pathSourceId);
          }
        } catch (error) {
          // Map might be in the process of being removed
          console.warn('Error cleaning up location tracker:', error);
        }
      }
      pathRef.current = [];
    };
  }, [map, showAccuracyCircle, layerId, sourceId, pathLayerId, pathSourceId]);

  // Update marker position
  useEffect(() => {
    if (!map || !position) return;

    // Check if map is loaded and valid
    if (!map.loaded || !map.loaded()) {
      // If map isn't loaded yet, wait for it and then center
      const onMapLoad = () => {
        if (position) {
          const lngLat: [number, number] = [position.longitude, position.latitude];
          
          // Update marker if it exists
          if (markerRef.current) {
            markerRef.current.setLngLat(lngLat);
          }
          
          // Center map on first location
          if (!hasCenteredRef.current) {
            hasCenteredRef.current = true;
            map.flyTo({
              center: lngLat,
              zoom: 16,
              duration: 1500,
            });
          }
        }
      };
      map.once('load', onMapLoad);
      return;
    }

    const { longitude, latitude, accuracy, heading } = position;
    const lngLat: [number, number] = [longitude, latitude];

    // Ensure marker exists and is on the map
    if (!markerRef.current) {
      // Create marker if it doesn't exist yet
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      
      // Outer pulsing circle
      const outerCircle = document.createElement('div');
      outerCircle.style.width = '40px';
      outerCircle.style.height = '40px';
      outerCircle.style.borderRadius = '50%';
      outerCircle.style.backgroundColor = '#4285f4';
      outerCircle.style.opacity = '0.3';
      outerCircle.style.position = 'absolute';
      outerCircle.style.top = '50%';
      outerCircle.style.left = '50%';
      outerCircle.style.transform = 'translate(-50%, -50%)';
      outerCircle.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite';
      
      // Middle circle
      const middleCircle = document.createElement('div');
      middleCircle.style.width = '20px';
      middleCircle.style.height = '20px';
      middleCircle.style.borderRadius = '50%';
      middleCircle.style.backgroundColor = '#4285f4';
      middleCircle.style.opacity = '0.5';
      middleCircle.style.position = 'absolute';
      middleCircle.style.top = '50%';
      middleCircle.style.left = '50%';
      middleCircle.style.transform = 'translate(-50%, -50%)';
      
      // Inner dot
      const innerDot = document.createElement('div');
      innerDot.style.width = '12px';
      innerDot.style.height = '12px';
      innerDot.style.borderRadius = '50%';
      innerDot.style.backgroundColor = '#ffffff';
      innerDot.style.border = '2px solid #4285f4';
      innerDot.style.position = 'absolute';
      innerDot.style.top = '50%';
      innerDot.style.left = '50%';
      innerDot.style.transform = 'translate(-50%, -50%)';
      innerDot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      innerDot.style.zIndex = '3';
      
      // Direction arrow
      const arrow = document.createElement('div');
      arrow.className = 'heading-arrow';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '6px solid transparent';
      arrow.style.borderRight = '6px solid transparent';
      arrow.style.borderBottom = '16px solid #4285f4';
      arrow.style.position = 'absolute';
      arrow.style.top = '50%';
      arrow.style.left = '50%';
      arrow.style.transform = 'translate(-50%, -50%) translateY(-18px)';
      arrow.style.transformOrigin = 'center bottom';
      arrow.style.opacity = '0';
      arrow.style.transition = 'opacity 0.3s ease, transform 0.3s ease-out';
      arrow.style.zIndex = '2';
      arrowRef.current = arrow;
      
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.position = 'relative';
      el.style.cursor = 'pointer';
      el.style.zIndex = '1000';
      
      el.appendChild(outerCircle);
      el.appendChild(middleCircle);
      el.appendChild(arrow);
      el.appendChild(innerDot);

      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      }).setLngLat(lngLat).addTo(map);
    }

    // Auto-center on first location acquisition (always, regardless of followUser)
    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.flyTo({
        center: lngLat,
        zoom: 16, // Good zoom level for location tracking
        duration: 1500,
      });
    }

    try {
      markerRef.current.setLngLat(lngLat);
      
      // Update arrow rotation if heading is available
      if (arrowRef.current && heading !== null && heading !== undefined) {
        // Convert heading (0-360 degrees, where 0 is north) to CSS rotation
        // CSS rotation: 0deg = pointing up (north), clockwise is positive
        arrowRef.current.style.transform = `translate(-50%, -50%) translateY(-18px) rotate(${heading}deg)`;
        arrowRef.current.style.opacity = '1';
      } else if (arrowRef.current) {
        // Hide arrow if no heading
        arrowRef.current.style.opacity = '0';
      }

      // Update accuracy circle
      if (showAccuracyCircle && accuracy) {
        try {
          const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: lngLat,
              },
              properties: {},
            });

            // Update circle radius in meters
            // Mapbox circle-radius is in pixels, so we need to convert
            // For better accuracy, we'll use a data-driven expression
            const metersPerPixel = (40075017 * Math.cos((latitude * Math.PI) / 180)) / (256 * Math.pow(2, map.getZoom()));
            const radiusInPixels = accuracy / metersPerPixel;

            if (map.getLayer && map.getLayer(layerId)) {
              map.setPaintProperty(layerId, 'circle-radius', radiusInPixels);
            }
          }
        } catch (error) {
          // Source or layer might not exist yet
          console.warn('Error updating accuracy circle:', error);
        }
      }

      // Update movement path
      if (showPath) {
        try {
          // Add current position to path (keep last 100 points for performance)
          pathRef.current.push(lngLat);
          if (pathRef.current.length > 100) {
            pathRef.current.shift();
          }

          // Update path line if source exists
          if (map.getSource(pathSourceId)) {
            const pathSource = map.getSource(pathSourceId) as mapboxgl.GeoJSONSource;
            if (pathSource && pathRef.current.length > 1) {
              pathSource.setData({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: pathRef.current,
                },
                properties: {},
              });
            }
          }
        } catch (error) {
          console.warn('Error updating path:', error);
        }
      }

      // Follow user if enabled - use smooth easing for real-time tracking
      if (followUser && isTracking && hasCenteredRef.current) {
        // Use easeTo for smoother real-time following instead of flyTo
        map.easeTo({
          center: lngLat,
          zoom: Math.max(map.getZoom(), 15),
          duration: 300, // Shorter duration for real-time feel
          easing: (t) => t * (2 - t), // Ease-out function for smooth movement
        });
      }
    } catch (error) {
      // Map might be in the process of being removed or not fully loaded
      console.warn('Error updating location tracker:', error);
    }
  }, [position, map, followUser, isTracking, showAccuracyCircle, layerId, sourceId]);

  // Reset centering state when map changes
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [map]);

  // Auto-start tracking - don't wait for map
  useEffect(() => {
    if (!isTracking && !error) {
      startTracking();
    }
  }, [isTracking, error, startTracking]);

  if (error) {
    return (
      <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-10">
        <p className="text-sm">
          Location Error: {error.message}
        </p>
      </div>
    );
  }

  return null;
}

