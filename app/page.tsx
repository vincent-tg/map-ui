'use client';

import { useState, useEffect } from 'react';
import MapboxMap from '@/components/Map/MapboxMap';
import LocationTracker from '@/components/Map/LocationTracker';
import NavigationControls from '@/components/Map/NavigationControls';
import CenterLocationButton from '@/components/Map/CenterLocationButton';
import TripRecordingButton from '@/components/Map/TripRecordingButton';
import MenuButton from '@/components/Map/MenuButton';
import DiscoverButton from '@/components/Map/DiscoverButton';
import SpeedButton from '@/components/Map/SpeedButton';
import ActionBar from '@/components/ActionBar';
import SearchPanel from '@/components/SearchPanel';
import { useMap } from '@/contexts/MapContext';
import { useTripHistory } from '@/hooks/useTripHistory';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationPoint, Trip } from '@/types';
import mapboxgl from 'mapbox-gl';

export default function Home() {
  const { map } = useMap();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripLayerId, setTripLayerId] = useState<string | null>(null);
  const { addLocationToCurrentTrip } = useTripHistory();
  
  const { position } = useGeolocation({
    onLocationUpdate: (location: LocationPoint) => {
      addLocationToCurrentTrip(location);
    },
  });

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
    // This will be handled by NavigationControls to calculate route
    // The SearchPanel will trigger the geocoder result event
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

  return (
    <div className="relative w-full h-screen flex flex-col bg-white">
      {/* Map Section - Takes 2/3 of screen */}
      <div className="relative flex-1" style={{ height: '66.67%' }}>
        <MapboxMap>
          {map && (
            <>
              <LocationTracker
                map={map}
                onLocationUpdate={handleLocationUpdate}
                followUser={!selectedTrip}
                showPath={true}
              />
              <NavigationControls
                map={map}
                currentLocation={
                  position
                    ? [position.longitude, position.latitude]
                    : null
                }
              />
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
        </MapboxMap>
      </div>

      {/* Action Bar - Takes 1/3 of screen */}
      <div className="flex-shrink-0" style={{ height: '33.33%' }}>
        <ActionBar />
      </div>

      {/* Search Panel */}
      <SearchPanel
        currentLocation={
          position
            ? [position.longitude, position.latitude]
            : null
        }
        map={map}
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
}
