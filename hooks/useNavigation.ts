'use client';

import { useState, useCallback, useEffect } from 'react';
import { NavigationState, NavigationRoute } from '@/types';
import { calculateRoute, getCurrentInstruction, getRemainingRouteInfo } from '@/lib/navigation';
import { getMapboxToken } from '@/lib/mapbox';

export function useNavigation() {
  const [state, setState] = useState<NavigationState>({
    isActive: false,
    route: null,
    currentStepIndex: 0,
    origin: null,
    destination: null,
    waypoints: [],
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRouteToDestination = useCallback(
    async (
      origin: [number, number],
      destination: [number, number],
      waypoints: [number, number][] = []
    ) => {
      setIsCalculating(true);
      setError(null);

      try {
        const token = getMapboxToken();
        if (!token) {
          throw new Error('Mapbox token not configured');
        }

        const route = await calculateRoute(
          { origin, destination, waypoints },
          token
        );

        if (route) {
          setState((prev) => ({
            ...prev,
            route,
            origin,
            destination,
            waypoints,
            currentStepIndex: 0,
          }));
        } else {
          setError('Could not calculate route');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to calculate route';
        setError(errorMessage);
        console.error('Navigation error:', err);
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  const startNavigation = useCallback(() => {
    if (state.route) {
      setState((prev) => ({ ...prev, isActive: true }));
    }
  }, [state.route]);

  const stopNavigation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      currentStepIndex: 0,
    }));
  }, []);

  const updateCurrentStep = useCallback((stepIndex: number) => {
    if (state.route && stepIndex >= 0 && stepIndex < state.route.steps.length) {
      setState((prev) => ({ ...prev, currentStepIndex: stepIndex }));
    }
  }, [state.route]);

  const nextStep = useCallback(() => {
    if (state.route) {
      const nextIndex = state.currentStepIndex + 1;
      if (nextIndex < state.route.steps.length) {
        updateCurrentStep(nextIndex);
      } else {
        // Reached destination
        stopNavigation();
      }
    }
  }, [state.route, state.currentStepIndex, updateCurrentStep, stopNavigation]);

  const getCurrentInstructionText = useCallback((): string => {
    return getCurrentInstruction(state.route, state.currentStepIndex);
  }, [state.route, state.currentStepIndex]);

  const getRemainingInfo = useCallback(() => {
    return getRemainingRouteInfo(state.route, state.currentStepIndex);
  }, [state.route, state.currentStepIndex]);

  const clearRoute = useCallback(() => {
    setState({
      isActive: false,
      route: null,
      currentStepIndex: 0,
      origin: null,
      destination: null,
      waypoints: [],
    });
    setError(null);
  }, []);

  return {
    ...state,
    isCalculating,
    error,
    calculateRouteToDestination,
    startNavigation,
    stopNavigation,
    updateCurrentStep,
    nextStep,
    getCurrentInstructionText,
    getRemainingInfo,
    clearRoute,
  };
}

