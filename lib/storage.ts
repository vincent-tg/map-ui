import { Trip, LocationPoint } from '@/types';
import { calculateTotalDistance, calculateAverageSpeed } from './location';

const STORAGE_KEY = 'map-tracking-trips';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for localStorage

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Get storage size in bytes
 */
function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Save trip to localStorage
 */
export function saveTrip(trip: Trip): boolean {
  try {
    const trips = loadTrips();
    
    // Check storage size before adding
    const tripJson = JSON.stringify(trip);
    const currentSize = getStorageSize();
    
    if (currentSize + tripJson.length > MAX_STORAGE_SIZE) {
      // Remove oldest trips if storage is full
      trips.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      while (getStorageSize() + tripJson.length > MAX_STORAGE_SIZE && trips.length > 0) {
        trips.shift();
      }
    }
    
    trips.push(trip);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    return true;
  } catch (error) {
    console.error('Error saving trip:', error);
    return false;
  }
}

/**
 * Load all trips from localStorage
 */
export function loadTrips(): Trip[] {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const trips = JSON.parse(data) as Trip[];
    // Convert date strings back to Date objects
    return trips.map(trip => ({
      ...trip,
      startTime: new Date(trip.startTime),
      endTime: new Date(trip.endTime),
    }));
  } catch (error) {
    console.error('Error loading trips:', error);
    return [];
  }
}

/**
 * Delete a trip by ID
 */
export function deleteTrip(tripId: string): boolean {
  try {
    const trips = loadTrips();
    const filtered = trips.filter(trip => trip.id !== tripId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    return false;
  }
}

/**
 * Get trip by ID
 */
export function getTripById(tripId: string): Trip | null {
  const trips = loadTrips();
  return trips.find(trip => trip.id === tripId) || null;
}

/**
 * Create a new trip from location points
 */
export function createTripFromLocations(
  locations: LocationPoint[],
  name?: string
): Trip {
  if (locations.length === 0) {
    throw new Error('Cannot create trip with no locations');
  }

  const startTime = new Date(locations[0].timestamp);
  const endTime = new Date(locations[locations.length - 1].timestamp);
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  const distance = calculateTotalDistance(locations);
  const averageSpeed = calculateAverageSpeed(distance, duration);

  return {
    id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime,
    endTime,
    locations,
    distance,
    duration,
    averageSpeed,
    name,
  };
}

/**
 * Export trip as JSON
 */
export function exportTripAsJSON(trip: Trip): string {
  return JSON.stringify(trip, null, 2);
}

/**
 * Export trip as GPX
 */
export function exportTripAsGPX(trip: Trip): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Map Tracking App">
  <trk>
    <name>${trip.name || `Trip ${trip.id}`}</name>
    <trkseg>`;

  const points = trip.locations
    .map(
      (loc) =>
        `      <trkpt lat="${loc.latitude}" lon="${loc.longitude}">
        <time>${new Date(loc.timestamp).toISOString()}</time>
        ${loc.altitude ? `<ele>${loc.altitude}</ele>` : ''}
      </trkpt>`
    )
    .join('\n');

  const footer = `
    </trkseg>
  </trk>
</gpx>`;

  return header + points + footer;
}

/**
 * Clear all trips
 */
export function clearAllTrips(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing trips:', error);
    return false;
  }
}

