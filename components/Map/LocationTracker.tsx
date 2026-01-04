'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { LocationPoint } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';

interface LocationTrackerProps {
  readonly map: mapboxgl.Map | null;
  readonly onLocationUpdate?: (location: LocationPoint) => void;
  readonly followUser?: boolean;
  readonly showAccuracyCircle?: boolean;
  readonly showPath?: boolean; // Show movement trail
  readonly navigationMode?: boolean; // Show arrow marker for navigation
  readonly minimalMarker?: boolean; // Show only small dot marker (no pulsing circles)
}

export default function LocationTracker({
  map,
  onLocationUpdate,
  followUser = true,
  showAccuracyCircle = true,
  showPath = true,
  navigationMode = false,
  minimalMarker = false,
}: LocationTrackerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const markerContainerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<[number, number][]>([]);
  const hasCenteredRef = useRef(false); // Track if we've centered on first location
  const lastNavigationModeRef = useRef(navigationMode);
  const sourceId = 'user-location';
  const layerId = 'user-location-circle';
  const pathSourceId = 'user-location-path';
  const pathLayerId = 'user-location-path-line';

  const {
    position,
    isTracking,
    startTracking,
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
      
      // Store container reference for navigation mode updates
      markerContainerRef.current = el;
      
      // Add data attributes for easy access to child elements
      outerCircle.dataset.markerPart = 'outer';
      middleCircle.dataset.markerPart = 'middle';
      arrow.dataset.markerPart = 'arrow';
      innerDot.dataset.markerPart = 'dot';

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
          if (map.getLayer?.(layerId)) {
            map.removeLayer(layerId);
          }
          if (map.getSource?.(sourceId)) {
            map.removeSource(sourceId);
          }
          if (map.getLayer?.(pathLayerId)) {
            map.removeLayer(pathLayerId);
          }
          if (map.getSource?.(pathSourceId)) {
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

  // Helper function to create marker element
  const createMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    
    const outerCircle = document.createElement('div');
    outerCircle.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background-color: #4285f4; opacity: 0.3; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;';
    
    const middleCircle = document.createElement('div');
    middleCircle.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; background-color: #4285f4; opacity: 0.5; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);';
    
    const innerDot = document.createElement('div');
    innerDot.style.cssText = 'width: 12px; height: 12px; border-radius: 50%; background-color: #ffffff; border: 2px solid #4285f4; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 3;';
    
    const arrow = document.createElement('div');
    arrow.className = 'heading-arrow';
    arrow.style.cssText = 'width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 16px solid #4285f4; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) translateY(-18px); transform-origin: center bottom; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease-out; z-index: 2;';
    arrowRef.current = arrow;
    
    el.style.cssText = 'width: 40px; height: 40px; position: relative; cursor: pointer; z-index: 1000;';
    
    el.appendChild(outerCircle);
    el.appendChild(middleCircle);
    el.appendChild(arrow);
    el.appendChild(innerDot);
    
    return el;
  };

  // Helper function to update arrow heading
  const updateArrowHeading = (heading: number | null | undefined) => {
    if (!arrowRef.current) return;
    
    if (heading !== null && heading !== undefined) {
      arrowRef.current.style.transform = `translate(-50%, -50%) translateY(-18px) rotate(${heading}deg)`;
      arrowRef.current.style.opacity = '1';
    } else {
      arrowRef.current.style.opacity = '0';
    }
  };

  // Helper function to update accuracy circle
  const updateAccuracyCircle = (map: mapboxgl.Map, lngLat: [number, number], accuracy: number, latitude: number) => {
    if (!showAccuracyCircle || !accuracy) return;
    
    try {
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (!source) return;
      
      source.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: lngLat },
        properties: {},
      });

      const metersPerPixel = (40075017 * Math.cos((latitude * Math.PI) / 180)) / (256 * Math.pow(2, map.getZoom()));
      const radiusInPixels = accuracy / metersPerPixel;

      if (map.getLayer?.(layerId)) {
        map.setPaintProperty(layerId, 'circle-radius', radiusInPixels);
      }
    } catch (error) {
      console.warn('Error updating accuracy circle:', error);
    }
  };

  // Helper function to update movement path
  const updateMovementPath = (map: mapboxgl.Map, lngLat: [number, number]) => {
    if (!showPath) return;
    
    try {
      pathRef.current.push(lngLat);
      if (pathRef.current.length > 100) {
        pathRef.current.shift();
      }

      const pathSource = map.getSource(pathSourceId) as mapboxgl.GeoJSONSource;
      if (pathSource && pathRef.current.length > 1) {
        pathSource.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: pathRef.current },
          properties: {},
        });
      }
    } catch (error) {
      console.warn('Error updating path:', error);
    }
  };

  // Helper function to handle map load
  const handleMapLoad = (map: mapboxgl.Map, position: LocationPoint) => {
    const lngLat: [number, number] = [position.longitude, position.latitude];
    
    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    }
  };

  // Center on current location ONCE when map first loads and position is available
  useEffect(() => {
    if (!map || !position || hasCenteredRef.current) return;
    
    // Wait for map to be loaded before centering
    if (!map.loaded?.()) {
      map.once('load', () => {
        if (!hasCenteredRef.current) {
          const lngLat: [number, number] = [position.longitude, position.latitude];
          hasCenteredRef.current = true;
          map.flyTo({ center: lngLat, zoom: 16, duration: 1500 });
        }
      });
      return;
    }

    // Map is loaded, center immediately (only once)
    if (!hasCenteredRef.current) {
      const lngLat: [number, number] = [position.longitude, position.latitude];
      hasCenteredRef.current = true;
      map.flyTo({ center: lngLat, zoom: 16, duration: 1500 });
    }
  }, [map, position]);

  // Update marker position
  useEffect(() => {
    if (!map || !position) return;

    // Check if map is loaded and valid
    if (!map.loaded?.()) {
      map.once('load', () => handleMapLoad(map, position));
      return;
    }

    const { longitude, latitude, accuracy, heading } = position;
    const lngLat: [number, number] = [longitude, latitude];

    // Create marker if it doesn't exist
    if (!markerRef.current) {
      const el = createMarkerElement();
      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      }).setLngLat(lngLat).addTo(map);
    }

    try {
      markerRef.current.setLngLat(lngLat);
      updateArrowHeading(heading);
      updateAccuracyCircle(map, lngLat, accuracy || 0, latitude);
      updateMovementPath(map, lngLat);

      // Map only centers once on first location - no continuous following
      // User can freely look around after initial centering
    } catch (error) {
      // Map might be in the process of being removed or not fully loaded
      console.warn('Error updating location tracker:', error);
    }
  }, [position, map, followUser, isTracking, showAccuracyCircle, layerId, sourceId]);

  // Reset centering state when map changes
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [map]);

  // Helper to apply navigation mode styles
  const applyNavigationModeStyles = useCallback((
    outer: HTMLDivElement | null,
    middle: HTMLDivElement | null,
    dot: HTMLDivElement | null,
    arrow: HTMLDivElement | null,
    heading: number
  ) => {
    if (outer) outer.style.opacity = '0';
    if (middle) middle.style.opacity = '0';
    if (dot) dot.style.opacity = '0';
    if (arrow) {
      arrow.style.borderLeft = '14px solid transparent';
      arrow.style.borderRight = '14px solid transparent';
      arrow.style.borderBottom = '35px solid #4285f4';
      arrow.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`;
      arrow.style.transformOrigin = 'center center';
      arrow.style.opacity = '1';
      arrow.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))';
    }
  }, []);

  // Helper to apply minimal marker styles (user location when destination is selected)
  const applyMinimalMarkerStyles = useCallback((
    outer: HTMLDivElement | null,
    middle: HTMLDivElement | null,
    dot: HTMLDivElement | null,
    arrow: HTMLDivElement | null
  ) => {
    if (outer) outer.style.opacity = '0';
    if (middle) {
      // Show a subtle blue ring around the dot
      middle.style.opacity = '0.4';
      middle.style.width = '24px';
      middle.style.height = '24px';
    }
    if (dot) {
      // Make dot larger and more visible
      dot.style.width = '14px';
      dot.style.height = '14px';
      dot.style.opacity = '1';
      dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
    }
    if (arrow) arrow.style.opacity = '0';
  }, []);

  // Helper to apply normal marker styles
  const applyNormalMarkerStyles = useCallback((
    outer: HTMLDivElement | null,
    middle: HTMLDivElement | null,
    dot: HTMLDivElement | null,
    arrow: HTMLDivElement | null,
    heading: number | null | undefined
  ) => {
    if (outer) outer.style.opacity = '0.3';
    if (middle) {
      middle.style.opacity = '0.5';
      middle.style.width = '20px';
      middle.style.height = '20px';
    }
    if (dot) {
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.opacity = '1';
      dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    }
    if (arrow) {
      arrow.style.borderLeft = '6px solid transparent';
      arrow.style.borderRight = '6px solid transparent';
      arrow.style.borderBottom = '16px solid #4285f4';
      arrow.style.transform = `translate(-50%, -50%) translateY(-18px) rotate(${heading || 0}deg)`;
      arrow.style.transformOrigin = 'center bottom';
      arrow.style.filter = 'none';
      arrow.style.opacity = heading == null ? '0' : '1';
    }
  }, []);

  // Update marker appearance when navigation mode or minimalMarker changes
  useEffect(() => {
    if (!markerContainerRef.current) return;
    
    const container = markerContainerRef.current;
    const outer = container.querySelector<HTMLDivElement>('[data-marker-part="outer"]');
    const middle = container.querySelector<HTMLDivElement>('[data-marker-part="middle"]');
    const dot = container.querySelector<HTMLDivElement>('[data-marker-part="dot"]');
    const arrow = container.querySelector<HTMLDivElement>('[data-marker-part="arrow"]');
    
    if (navigationMode) {
      applyNavigationModeStyles(outer, middle, dot, arrow, position?.heading || 0);
    } else if (minimalMarker) {
      applyMinimalMarkerStyles(outer, middle, dot, arrow);
    } else {
      applyNormalMarkerStyles(outer, middle, dot, arrow, position?.heading);
    }
    
    lastNavigationModeRef.current = navigationMode;
  }, [navigationMode, minimalMarker, position?.heading, applyNavigationModeStyles, applyMinimalMarkerStyles, applyNormalMarkerStyles]);

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

