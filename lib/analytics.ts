/**
 * Analytics/Event logging utility
 * Logs user interactions and events for analytics
 */

interface LogEventParams {
  [key: string]: any;
}

export function logEvent(eventName: string, params?: LogEventParams) {
  // In production, this would send to your analytics service
  // For now, we'll log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, params);
  }
  
  // TODO: Integrate with your analytics service (e.g., Google Analytics, Mixpanel, etc.)
  // Example:
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', eventName, params);
  // }
}

/**
 * Route request log entry
 */
export interface RouteLogEntry {
  id: string;
  timestamp: number;
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  destinationName: string;
  distance: number; // meters
  duration: number; // seconds
}

const ROUTE_LOG_STORAGE_KEY = 'map-tracking-route-logs';
const MAX_LOG_ENTRIES = 100;

/**
 * Log a route request to localStorage for analytics
 */
export function logRouteRequest(
  origin: [number, number],
  destination: [number, number],
  destinationName: string,
  routeInfo: { distance: number; duration: number }
): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Create new log entry
    const entry: RouteLogEntry = {
      id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      origin: {
        lng: origin[0],
        lat: origin[1],
      },
      destination: {
        lng: destination[0],
        lat: destination[1],
      },
      destinationName,
      distance: routeInfo.distance,
      duration: routeInfo.duration,
    };
    
    // Get existing logs
    const existingLogs = getRouteLog();
    
    // Add new entry and limit to MAX_LOG_ENTRIES
    const updatedLogs = [entry, ...existingLogs].slice(0, MAX_LOG_ENTRIES);
    
    // Save to localStorage
    localStorage.setItem(ROUTE_LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
    
    // Also log the event for analytics services
    logEvent('route_calculated', {
      origin_lat: origin[1],
      origin_lng: origin[0],
      destination_lat: destination[1],
      destination_lng: destination[0],
      destination_name: destinationName,
      distance_meters: routeInfo.distance,
      duration_seconds: routeInfo.duration,
    });
  } catch (error) {
    console.warn('Failed to log route request:', error);
  }
}

/**
 * Get all route logs from localStorage
 */
export function getRouteLog(): RouteLogEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const storedLogs = localStorage.getItem(ROUTE_LOG_STORAGE_KEY);
    if (!storedLogs) return [];
    
    const logs = JSON.parse(storedLogs);
    if (!Array.isArray(logs)) return [];
    
    return logs as RouteLogEntry[];
  } catch (error) {
    console.warn('Failed to read route logs:', error);
    return [];
  }
}

/**
 * Clear all route logs from localStorage
 */
export function clearRouteLog(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ROUTE_LOG_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear route logs:', error);
  }
}

/**
 * Get route log statistics
 */
export function getRouteLogStats(): {
  totalRoutes: number;
  totalDistance: number;
  totalDuration: number;
  averageDistance: number;
  averageDuration: number;
} {
  const logs = getRouteLog();
  
  if (logs.length === 0) {
    return {
      totalRoutes: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageDistance: 0,
      averageDuration: 0,
    };
  }
  
  const totalDistance = logs.reduce((sum, log) => sum + log.distance, 0);
  const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);
  
  return {
    totalRoutes: logs.length,
    totalDistance,
    totalDuration,
    averageDistance: totalDistance / logs.length,
    averageDuration: totalDuration / logs.length,
  };
}

