'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
// @ts-ignore - MapboxDirections doesn't have TypeScript definitions
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { getMapboxToken } from '@/lib/mapbox';

interface MapboxDirectionsControlProps {
  map: mapboxgl.Map | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
  onRouteChange?: (route: any) => void;
  onError?: (error: Error) => void;
}

export default function MapboxDirectionsControl({
  map,
  origin,
  destination,
  onRouteChange,
  onError,
}: MapboxDirectionsControlProps) {
  const directionsRef = useRef<MapboxDirections | null>(null);
  const onRouteChangeRef = useRef(onRouteChange);
  const onErrorRef = useRef(onError);
  const [isInitialized, setIsInitialized] = useState(false);
  const initAttemptRef = useRef(0);

  // Keep callbacks up to date
  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
    onErrorRef.current = onError;
  }, [onRouteChange, onError]);

  // Initialize directions control
  useEffect(() => {
    if (!map) return;

    const token = getMapboxToken();
    if (!token) {
      console.error('Mapbox token not found');
      onErrorRef.current?.(new Error('Mapbox token not found'));
      return;
    }

    const initializeDirections = () => {
      // Don't reinitialize if already done
      if (directionsRef.current) {
        setIsInitialized(true);
        return;
      }

      initAttemptRef.current += 1;
      console.log('Initializing MapboxDirections, attempt:', initAttemptRef.current);

      try {
        // Initialize MapboxDirections
        const directions = new MapboxDirections({
          accessToken: token,
          unit: 'metric',
          profile: 'mapbox/driving',
          alternatives: false,
          geometries: 'geojson',
          controls: {
            inputs: false,
            instructions: false,
            profileSwitcher: false,
          },
        });

        // Add to map
        map.addControl(directions, 'top-left');
        
        // Hide the directions control UI
        setTimeout(() => {
          const directionsElement = document.querySelector('.mapbox-directions-component');
          if (directionsElement) {
            const el = directionsElement as HTMLElement;
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            el.style.top = '-9999px';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        }, 50);

        // Listen for route events
        directions.on('route', (e: any) => {
          console.log('Route event received:', e);
          if (e.route && Array.isArray(e.route) && e.route.length > 0) {
            const route = e.route[0];
            console.log('Calling onRouteChange with route');
            onRouteChangeRef.current?.(route);
          } else if (e.route) {
            console.log('Calling onRouteChange with route (direct)');
            onRouteChangeRef.current?.(e.route);
          } else {
            console.warn('Route event has no route data:', e);
          }
        });

        directions.on('error', (e: any) => {
          console.error('Directions error:', e);
          const error = new Error(e.error?.message || e.message || 'Directions error');
          onErrorRef.current?.(error);
        });

        directionsRef.current = directions;
        setIsInitialized(true);
        console.log('MapboxDirections initialized successfully');
      } catch (error) {
        console.error('Error initializing directions:', error);
        onErrorRef.current?.(error as Error);
      }
    };

    if (map.loaded()) {
      initializeDirections();
    } else {
      map.once('load', initializeDirections);
    }

    return () => {
      if (directionsRef.current && map) {
        try {
          map.removeControl(directionsRef.current);
        } catch (error) {
          console.warn('Error removing directions control:', error);
        }
        directionsRef.current = null;
        setIsInitialized(false);
      }
    };
  }, [map]);

  // Set origin and destination when they change
  useEffect(() => {
    if (!origin || !destination || !map) return;
    
    // If not initialized yet, wait a bit and try via direct API as fallback
    if (!directionsRef.current || !isInitialized) {
      console.log('Directions not yet initialized, using direct API...');
      
      // Use direct API as fallback
      const fetchDirectRoute = async () => {
        const token = getMapboxToken();
        if (!token) return;
        
        try {
          const coordString = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?` +
            `access_token=${token}&geometries=geojson&steps=true&overview=full`;
          
          console.log('Fetching route directly from API...');
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Directions API error: ${response.statusText}`);
          }
          
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            console.log('Direct API route received');
            onRouteChangeRef.current?.(data.routes[0]);
          }
        } catch (error) {
          console.error('Direct API route error:', error);
          onErrorRef.current?.(error as Error);
        }
      };
      
      // Small delay to allow control to initialize first
      const timeout = setTimeout(fetchDirectRoute, 500);
      return () => clearTimeout(timeout);
    }
    
    // Wait for map to be loaded
    if (!map.loaded()) {
      const onLoad = () => setDirectionsCoords();
      map.once('load', onLoad);
      return () => { map.off('load', onLoad); };
    }

    setDirectionsCoords();

    function setDirectionsCoords() {
      if (!directionsRef.current || !origin || !destination) return;
      
      try {
        console.log('Setting directions:', { origin, destination });
        
        // Clear and set with minimal delays
        directionsRef.current.setOrigin(origin);
        
        setTimeout(() => {
          if (directionsRef.current && destination) {
            directionsRef.current.setDestination(destination);
          }
        }, 100);
      } catch (error) {
        console.error('Error setting directions:', error);
        onErrorRef.current?.(error as Error);
      }
    }
  }, [origin, destination, map, isInitialized]);

  return null;
}

