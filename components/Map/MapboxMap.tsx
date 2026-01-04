'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { initializeMapbox, getMapboxStyle, MAPBOX_CONFIG } from '@/lib/mapbox';
import { useMap } from '@/contexts/MapContext';

interface MapboxMapProps {
  className?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
}

export default function MapboxMap({
  className = '',
  onMapLoad,
  center,
  zoom,
  children,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { setMap } = useMap();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize Mapbox
    initializeMapbox();

    // Create map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapboxStyle(),
      center: center || MAPBOX_CONFIG.defaultCenter,
      zoom: zoom || MAPBOX_CONFIG.defaultZoom,
      minZoom: MAPBOX_CONFIG.minZoom,
      maxZoom: MAPBOX_CONFIG.maxZoom,
    });

    // Navigation and scale controls removed - hidden per user request

    // Handle map load
    map.current.on('load', () => {
      setIsMapLoaded(true);
      setMap(map.current!);
      onMapLoad?.(map.current!);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMap(null);
      }
    };
  }, [setMap, onMapLoad]);

  // Update center if prop changes
  useEffect(() => {
    if (map.current && center && isMapLoaded) {
      map.current.flyTo({
        center,
        duration: 1000,
      });
    }
  }, [center, isMapLoaded]);

  // Update zoom if prop changes
  useEffect(() => {
    if (map.current && zoom !== undefined && isMapLoaded) {
      map.current.flyTo({
        zoom,
        duration: 1000,
      });
    }
  }, [zoom, isMapLoaded]);

  // Resize map when container size changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const resizeMap = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    // Resize immediately and after a short delay to handle layout changes
    resizeMap();
    const timeoutId = setTimeout(resizeMap, 100);

    // Also listen for window resize
    window.addEventListener('resize', resizeMap);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeMap);
    };
  }, [isMapLoaded]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ height: '100%', width: '100%' }}>
      <div ref={mapContainer} className="w-full h-full" style={{ height: '100%', width: '100%' }} />
      {isMapLoaded && children}
      {/* Hide Mapbox logo and attribution */}
      <style jsx global>{`
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
        .mapboxgl-ctrl-attrib {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

