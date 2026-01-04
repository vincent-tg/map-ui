import { NavigationRoute, NavigationStep } from '@/types';

const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteRequest {
  origin: [number, number];
  destination: [number, number];
  waypoints?: [number, number][];
  alternatives?: boolean;
}

/**
 * Calculate route using Mapbox Directions API
 */
export async function calculateRoute(
  request: RouteRequest,
  accessToken: string
): Promise<NavigationRoute | null> {
  try {
    const coordinates = [
      request.origin,
      ...(request.waypoints || []),
      request.destination,
    ];

    const coordinatesString = coordinates
      .map((coord) => `${coord[0]},${coord[1]}`)
      .join(';');

    const url = `${MAPBOX_DIRECTIONS_API}/${coordinatesString}?` +
      `access_token=${accessToken}` +
      `&geometries=geojson` +
      `&steps=true` +
      `&overview=full` +
      `&alternatives=${request.alternatives ? 'true' : 'false'}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: NavigationStep[] = leg.steps.map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      instruction: step.maneuver.instruction || '',
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        location: step.maneuver.location,
      },
    }));

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps,
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    return null;
  }
}

/**
 * Get current navigation instruction
 */
export function getCurrentInstruction(
  route: NavigationRoute | null,
  currentStepIndex: number
): string {
  if (!route || currentStepIndex < 0 || currentStepIndex >= route.steps.length) {
    return '';
  }
  return route.steps[currentStepIndex].instruction;
}

/**
 * Get remaining distance and duration
 */
export function getRemainingRouteInfo(
  route: NavigationRoute | null,
  currentStepIndex: number
): { distance: number; duration: number } {
  if (!route || currentStepIndex < 0) {
    return { distance: 0, duration: 0 };
  }

  let remainingDistance = 0;
  let remainingDuration = 0;

  for (let i = currentStepIndex; i < route.steps.length; i++) {
    remainingDistance += route.steps[i].distance;
    remainingDuration += route.steps[i].duration;
  }

  return { distance: remainingDistance, duration: remainingDuration };
}

