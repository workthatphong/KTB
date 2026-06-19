import React, { createContext, useContext } from 'react';

const DashboardContext = createContext(null);

export function DashboardProvider({ dashboard, controller, children }) {
  return (
    <DashboardContext.Provider value={{ dashboard, controller }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return context;
}
