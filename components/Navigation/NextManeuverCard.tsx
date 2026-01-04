'use client';

import { NavigationStep } from '@/types';
import { formatDistance } from '@/lib/location';

interface NextManeuverCardProps {
  readonly step: NavigationStep;
  readonly distanceToManeuver: number;
  readonly isNextStep?: NavigationStep | null;
}

// Large maneuver icons for active navigation
function getManeuverIcon(type: string, modifier?: string): React.ReactNode {
  const iconClass = "w-12 h-12";
  
  switch (type) {
    case 'turn':
      if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left') {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        );
      }
      if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right') {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        );
      }
      // U-turn
      if (modifier === 'uturn') {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        );
      }
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      );
    
    case 'new name':
    case 'continue':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      );
    
    case 'merge':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6l4 4 4-4" />
          <path d="M12 10v8" />
        </svg>
      );
    
    case 'on ramp':
    case 'off ramp':
      if (modifier?.includes('left')) {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6" />
            <path d="M12 9H6v6" />
            <path d="M12 21V9" />
          </svg>
        );
      }
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 15l6-6" />
          <path d="M12 9h6v6" />
          <path d="M12 21V9" />
        </svg>
      );
    
    case 'fork':
      if (modifier?.includes('left')) {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v6" />
            <path d="M6 15L12 9" />
            <path d="M6 21v-6" />
          </svg>
        );
      }
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v6" />
          <path d="M18 15L12 9" />
          <path d="M18 21v-6" />
        </svg>
      );
    
    case 'roundabout':
    case 'rotary':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
        </svg>
      );
    
    case 'arrive':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    
    case 'depart':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
    
    case 'end of road':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      );
    
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      );
  }
}

// Get background color based on maneuver urgency
function getUrgencyColor(distanceMeters: number): string {
  if (distanceMeters < 100) {
    return 'bg-orange-500'; // Imminent turn
  }
  if (distanceMeters < 300) {
    return 'bg-blue-600'; // Approaching
  }
  return 'bg-blue-500'; // Far
}

export default function NextManeuverCard({
  step,
  distanceToManeuver,
  isNextStep,
}: NextManeuverCardProps) {
  const bgColor = getUrgencyColor(distanceToManeuver);
  
  return (
    <div className={`${bgColor} text-white rounded-xl shadow-2xl overflow-hidden`}>
      {/* Main maneuver */}
      <div className="p-4 flex items-center gap-4">
        {/* Maneuver icon */}
        <div className="flex-shrink-0 bg-white/20 rounded-lg p-3">
          {getManeuverIcon(step.maneuver.type, step.maneuver.modifier)}
        </div>
        
        {/* Distance and instruction */}
        <div className="flex-1 min-w-0">
          <p className="text-3xl font-bold tracking-tight">
            {formatDistance(distanceToManeuver)}
          </p>
          <p className="text-lg font-medium opacity-95 mt-1 leading-tight">
            {step.instruction || 'Continue straight'}
          </p>
        </div>
      </div>
      
      {/* Next step preview (if available) */}
      {isNextStep && (
        <div className="bg-black/20 px-4 py-2 flex items-start gap-3">
          <span className="text-sm opacity-75 flex-shrink-0 pt-0.5">Then</span>
          <div className="flex-shrink-0 opacity-75">
            {getManeuverIcon(isNextStep.maneuver.type, isNextStep.maneuver.modifier)}
          </div>
          <p className="text-sm opacity-90 flex-1 leading-tight">
            {isNextStep.instruction || 'Continue'}
          </p>
          <span className="text-sm font-medium opacity-75 flex-shrink-0">
            {formatDistance(isNextStep.distance)}
          </span>
        </div>
      )}
    </div>
  );
}

