'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  isNavigationActive: boolean;
  setNavigationActive: (active: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <NavigationContext.Provider
      value={{
        isNavigationActive,
        setNavigationActive: setIsNavigationActive,
        showSearch,
        setShowSearch,
      }}
    >
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

