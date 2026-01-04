'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GeolocationState, LocationPoint } from '@/types';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number;
  onLocationUpdate?: (location: LocationPoint) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 30000, // Increased to 30 seconds for better GPS acquisition
    maximumAge = 0, // Always get fresh position for real-time tracking
    updateInterval = 1000,
    onLocationUpdate,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isTracking: false,
    permissionGranted: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);

  // Keep the callback ref up to date
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  const checkPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        permissionGranted: false,
        error: {
          code: 0,
          message: 'Geolocation is not supported by this browser',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return false;
    }

    try {
      // Check permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        setState((prev) => ({
          ...prev,
          permissionGranted: permission.state === 'granted',
        }));
        return permission.state === 'granted';
      }
      return true;
    } catch (error) {
      console.error('Error checking geolocation permission:', error);
      return true; // Assume granted if we can't check
    }
  }, []);

  const convertPositionToLocationPoint = useCallback(
    (position: GeolocationPosition): LocationPoint => {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };
    },
    []
  );

  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocation is not supported',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true }));

    const successCallback = (position: GeolocationPosition) => {
      const locationPoint = convertPositionToLocationPoint(position);
      setState((prev) => ({
        ...prev,
        position: locationPoint,
        error: null,
        permissionGranted: true,
      }));
      onLocationUpdateRef.current?.(locationPoint);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      
      // For timeout errors, don't stop tracking - just log and let it retry
      if (error.code === 3) {
        // TIMEOUT - keep trying, just update error state
        setState((prev) => ({
          ...prev,
          error,
          // Don't set isTracking to false for timeouts - keep trying
        }));
        return; // Don't clear watch on timeout, let it keep trying
      }
      
      // For other errors, stop tracking
      setState((prev) => ({
        ...prev,
        error,
        permissionGranted: error.code === 1 ? false : prev.permissionGranted,
        isTracking: false,
      }));
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    } catch (err) {
      console.error('Failed to start geolocation:', err);
      setState((prev) => ({
        ...prev,
        isTracking: false,
        error: {
          code: 0,
          message: 'Failed to start location tracking',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
    }
  }, [enableHighAccuracy, timeout, maximumAge, convertPositionToLocationPoint]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  // Auto-start tracking on mount (only once)
  useEffect(() => {
    let mounted = true;

    const initTracking = async () => {
      const hasPermission = await checkPermission();
      // Auto-start if permission is granted or can't be checked
      if (mounted && hasPermission !== false) {
        startTracking();
      }
    };

    initTracking();

    return () => {
      mounted = false;
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    ...state,
    startTracking,
    stopTracking,
    checkPermission,
  };
}

