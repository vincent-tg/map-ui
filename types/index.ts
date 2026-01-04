export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface Trip {
  id: string;
  startTime: Date;
  endTime: Date;
  locations: LocationPoint[];
  distance: number; // in meters
  duration: number; // in seconds
  averageSpeed: number; // in km/h
  name?: string;
}

export interface NavigationStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface NavigationRoute {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  steps: NavigationStep[];
}

export interface NavigationState {
  isActive: boolean;
  route: NavigationRoute | null;
  currentStepIndex: number;
  origin: [number, number] | null;
  destination: [number, number] | null;
  waypoints: [number, number][];
}

export interface GeolocationState {
  position: LocationPoint | null;
  error: GeolocationPositionError | null;
  isTracking: boolean;
  permissionGranted: boolean | null;
}

