import React, { createContext, useContext } from 'react';

const DashboardDataContext = createContext(null);
const DashboardUIContext = createContext(null);

export function DashboardProvider({ dashboard, controller, children }) {
  return (
    <DashboardDataContext.Provider value={dashboard}>
      <DashboardUIContext.Provider value={controller}>
        {children}
      </DashboardUIContext.Provider>
    </DashboardDataContext.Provider>
  );
}

export function useDashboardDataCtx() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error('useDashboardDataCtx must be used within DashboardProvider');
  return context;
}

export function useDashboardUICtx() {
  const context = useContext(DashboardUIContext);
  if (!context) throw new Error('useDashboardUICtx must be used within DashboardProvider');
  return context;
}
