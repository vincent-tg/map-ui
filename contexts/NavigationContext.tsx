'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { NavigationRoute, NavigationStep, NavigationMode, ActiveNavigationState } from '@/types';

interface SelectedLocation {
  coordinates: [number, number];
  name: string;
}

interface NavigationContextType {
  // Legacy state (kept for compatibility)
  isNavigationActive: boolean;
  setNavigationActive: (active: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (location: SelectedLocation | null) => void;
  
  // Enhanced navigation state
  navigationState: ActiveNavigationState;
  
  // Navigation actions
  setPreviewRoute: (route: NavigationRoute, destination: SelectedLocation, origin: [number, number]) => void;
  startActiveNavigation: () => void;
  updateNavigationProgress: (
    currentLocation: [number, number],
    distanceToNextManeuver: number,
    currentStepIndex: number
  ) => void;
  setOffRoute: (isOffRoute: boolean) => void;
  setRerouting: (isRerouting: boolean) => void;
  updateRoute: (route: NavigationRoute) => void;
  endNavigation: () => void;
  clearNavigation: () => void;
}

const initialNavigationState: ActiveNavigationState = {
  mode: 'idle',
  route: null,
  destination: null,
  origin: null,
  currentStepIndex: 0,
  distanceToNextManeuver: 0,
  isOffRoute: false,
  isRerouting: false,
  eta: null,
  remainingDistance: 0,
  remainingDuration: 0,
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  // Legacy state
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  
  // Enhanced navigation state
  const [navigationState, setNavigationState] = useState<ActiveNavigationState>(initialNavigationState);

  // Calculate ETA based on remaining duration
  const calculateETA = useCallback((remainingDuration: number): Date => {
    const now = new Date();
    return new Date(now.getTime() + remainingDuration * 1000);
  }, []);

  // Set route in preview mode (when user selects a location)
  const setPreviewRoute = useCallback((
    route: NavigationRoute,
    destination: SelectedLocation,
    origin: [number, number]
  ) => {
    setNavigationState({
      mode: 'preview',
      route,
      destination,
      origin,
      currentStepIndex: 0,
      distanceToNextManeuver: route.steps[0]?.distance || 0,
      isOffRoute: false,
      isRerouting: false,
      eta: calculateETA(route.duration),
      remainingDistance: route.distance,
      remainingDuration: route.duration,
    });
  }, [calculateETA]);

  // Start active turn-by-turn navigation
  const startActiveNavigation = useCallback(() => {
    if (navigationState.route) {
      setNavigationState(prev => ({
        ...prev,
        mode: 'active',
      }));
      setIsNavigationActive(true);
      // Clear selected location panel since we're now in active navigation
      setSelectedLocation(null);
    }
  }, [navigationState.route]);

  // Update navigation progress based on GPS
  const updateNavigationProgress = useCallback((
    currentLocation: [number, number],
    distanceToNextManeuver: number,
    currentStepIndex: number
  ) => {
    setNavigationState(prev => {
      if (!prev.route) return prev;
      
      // Calculate remaining distance and duration from current step onwards
      let remainingDistance = 0;
      let remainingDuration = 0;
      for (let i = currentStepIndex; i < prev.route.steps.length; i++) {
        remainingDistance += prev.route.steps[i].distance;
        remainingDuration += prev.route.steps[i].duration;
      }
      
      // Subtract the distance already covered in current step
      const currentStepDistance = prev.route.steps[currentStepIndex]?.distance || 0;
      remainingDistance = remainingDistance - currentStepDistance + distanceToNextManeuver;
      
      return {
        ...prev,
        currentStepIndex,
        distanceToNextManeuver,
        remainingDistance: Math.max(0, remainingDistance),
        remainingDuration: Math.max(0, remainingDuration),
        eta: calculateETA(remainingDuration),
        origin: currentLocation,
      };
    });
  }, [calculateETA]);

  // Set off-route status
  const setOffRoute = useCallback((isOffRoute: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      isOffRoute,
    }));
  }, []);

  // Set rerouting status
  const setRerouting = useCallback((isRerouting: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      isRerouting,
      isOffRoute: isRerouting ? prev.isOffRoute : false,
    }));
  }, []);

  // Update route (after rerouting)
  const updateRoute = useCallback((route: NavigationRoute) => {
    setNavigationState(prev => ({
      ...prev,
      route,
      currentStepIndex: 0,
      distanceToNextManeuver: route.steps[0]?.distance || 0,
      isOffRoute: false,
      isRerouting: false,
      remainingDistance: route.distance,
      remainingDuration: route.duration,
      eta: calculateETA(route.duration),
    }));
  }, [calculateETA]);

  // End navigation (arrived or user cancelled)
  const endNavigation = useCallback(() => {
    setNavigationState(initialNavigationState);
    setIsNavigationActive(false);
    setSelectedLocation(null);
  }, []);

  // Clear navigation and return to idle
  const clearNavigation = useCallback(() => {
    setNavigationState(initialNavigationState);
    setIsNavigationActive(false);
    setSelectedLocation(null);
  }, []);

  const value = useMemo(() => ({
    // Legacy
    isNavigationActive,
    setNavigationActive: setIsNavigationActive,
    showSearch,
    setShowSearch,
    selectedLocation,
    setSelectedLocation,
    
    // Enhanced
    navigationState,
    setPreviewRoute,
    startActiveNavigation,
    updateNavigationProgress,
    setOffRoute,
    setRerouting,
    updateRoute,
    endNavigation,
    clearNavigation,
  }), [
    isNavigationActive,
    showSearch,
    selectedLocation,
    navigationState,
    setPreviewRoute,
    startActiveNavigation,
    updateNavigationProgress,
    setOffRoute,
    setRerouting,
    updateRoute,
    endNavigation,
    clearNavigation,
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}
