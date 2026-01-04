import { LocationPoint } from '@/types';

/**
 * Calculate the distance between two points using the Haversine formula
 * @param point1 First location point
 * @param point2 Second location point
 * @returns Distance in meters
 */
export function calculateDistance(
  point1: LocationPoint,
  point2: LocationPoint
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance for a series of location points
 * @param locations Array of location points
 * @returns Total distance in meters
 */
export function calculateTotalDistance(locations: LocationPoint[]): number {
  if (locations.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    totalDistance += calculateDistance(locations[i - 1], locations[i]);
  }
  return totalDistance;
}

/**
 * Calculate average speed from trip data
 * @param distance Distance in meters
 * @param duration Duration in seconds
 * @returns Average speed in km/h
 */
export function calculateAverageSpeed(
  distance: number,
  duration: number
): number {
  if (duration === 0) return 0;
  const speedMs = distance / duration; // meters per second
  return (speedMs * 3600) / 1000; // convert to km/h
}

/**
 * Format distance for display
 * @param distance Distance in meters
 * @returns Formatted string
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(2)}km`;
}

/**
 * Format duration for display
 * @param duration Duration in seconds
 * @returns Formatted string
 */
export function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if location has moved significantly
 * @param point1 First location
 * @param point2 Second location
 * @param threshold Minimum distance in meters to consider movement
 * @returns True if movement exceeds threshold
 */
export function hasMoved(
  point1: LocationPoint | null,
  point2: LocationPoint,
  threshold: number = 10
): boolean {
  if (!point1) return true;
  return calculateDistance(point1, point2) > threshold;
}

