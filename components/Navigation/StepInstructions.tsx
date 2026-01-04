'use client';

import { useState } from 'react';
import { NavigationStep } from '@/types';
import { formatDistance, formatDuration } from '@/lib/location';

interface StepInstructionsProps {
  readonly steps: NavigationStep[];
  readonly currentStepIndex?: number;
  readonly collapsible?: boolean;
  readonly maxHeight?: string;
  readonly fillContainer?: boolean;
}

// Maneuver type to icon mapping
function getManeuverIcon(type: string, modifier?: string): React.ReactNode {
  const iconClass = "w-5 h-5 flex-shrink-0";
  
  switch (type) {
    case 'turn':
      if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left') {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        );
      }
      if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right') {
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        );
      }
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      );
    
    case 'new name':
    case 'continue':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      );
    
    case 'merge':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6l4 4 4-4" />
          <path d="M12 10v8" />
        </svg>
      );
    
    case 'on ramp':
    case 'off ramp':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
          <path d="M12 9v12" />
        </svg>
      );
    
    case 'fork':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v6" />
          <path d="M6 15l6-6 6 6" />
        </svg>
      );
    
    case 'roundabout':
    case 'rotary':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
        </svg>
      );
    
    case 'arrive':
    case 'end of road':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    
    case 'depart':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
    
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
  }
}

export default function StepInstructions({
  steps,
  currentStepIndex = -1,
  collapsible = true,
  maxHeight = '200px',
  fillContainer = false,
}: StepInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  // Determine if steps should be shown
  const showSteps = !collapsible || isExpanded || fillContainer;

  return (
    <div className={`w-full ${fillContainer ? 'h-full flex flex-col' : ''}`}>
      {/* Header - clickable to expand/collapse */}
      {collapsible && !fillContainer && (
        <button
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition rounded-t-lg border border-gray-200"
        >
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Directions ({steps.length} steps)
            </span>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Header for fillContainer mode - static, not collapsible */}
      {fillContainer && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-t-lg">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Directions ({steps.length} steps)
          </span>
        </div>
      )}

      {/* Steps list */}
      {showSteps && (
        <div
          className={`overflow-y-auto ${
            fillContainer 
              ? 'flex-1 border border-t-0 border-gray-200 rounded-b-lg' 
              : collapsible 
                ? 'border border-t-0 border-gray-200 rounded-b-lg' 
                : ''
          }`}
          style={fillContainer ? undefined : { maxHeight }}
        >
          <ul className="divide-y divide-gray-100">
            {steps.map((step, index) => {
              const isCurrent = index === currentStepIndex;
              const isPast = currentStepIndex >= 0 && index < currentStepIndex;
              
              return (
                <li
                  key={index}
                  className={`flex items-start gap-3 p-3 transition ${
                    isCurrent
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : isPast
                      ? 'bg-gray-50 opacity-60'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Step number and icon */}
                  <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
                    isCurrent
                      ? 'bg-blue-500 text-white'
                      : isPast
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getManeuverIcon(step.maneuver.type, step.maneuver.modifier)}
                  </div>
                  
                  {/* Step details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                      {step.instruction || `Step ${index + 1}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatDistance(step.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(step.duration)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

