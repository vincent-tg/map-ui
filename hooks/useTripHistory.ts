'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trip, LocationPoint } from '@/types';
import {
  saveTrip,
  loadTrips,
  deleteTrip,
  createTripFromLocations,
  clearAllTrips,
  getTripById,
} from '@/lib/storage';

export function useTripHistory() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTripLocations, setCurrentTripLocations] = useState<
    LocationPoint[]
  >([]);
  const [isRecording, setIsRecording] = useState(false);

  // Load trips on mount
  useEffect(() => {
    const loadedTrips = loadTrips();
    setTrips(loadedTrips);
    setIsLoading(false);
  }, []);

  const addLocationToCurrentTrip = useCallback((location: LocationPoint) => {
    if (isRecording) {
      setCurrentTripLocations((prev) => [...prev, location]);
    }
  }, [isRecording]);

  const startRecording = useCallback(() => {
    setCurrentTripLocations([]);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(
    (save: boolean = true, name?: string) => {
      setIsRecording(false);
      if (save && currentTripLocations.length > 0) {
        try {
          const trip = createTripFromLocations(currentTripLocations, name);
          if (saveTrip(trip)) {
            setTrips((prev) => [...prev, trip]);
            setCurrentTripLocations([]);
            return trip;
          }
        } catch (error) {
          console.error('Error saving trip:', error);
        }
      }
      setCurrentTripLocations([]);
      return null;
    },
    [currentTripLocations]
  );

  const removeTrip = useCallback(
    (tripId: string) => {
      if (deleteTrip(tripId)) {
        setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
        return true;
      }
      return false;
    },
    []
  );

  const getTrip = useCallback((tripId: string) => {
    return getTripById(tripId);
  }, []);

  const clearAll = useCallback(() => {
    if (clearAllTrips()) {
      setTrips([]);
      return true;
    }
    return false;
  }, []);

  const refreshTrips = useCallback(() => {
    const loadedTrips = loadTrips();
    setTrips(loadedTrips);
  }, []);

  return {
    trips,
    isLoading,
    currentTripLocations,
    isRecording,
    startRecording,
    stopRecording,
    addLocationToCurrentTrip,
    removeTrip,
    getTrip,
    clearAll,
    refreshTrips,
  };
}

