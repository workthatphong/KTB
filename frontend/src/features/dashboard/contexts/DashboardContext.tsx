import React, { createContext, useContext, ReactNode } from 'react';
import { DashboardState, DashboardUIState } from '../types';

const DashboardDataContext = createContext<DashboardState | null>(null);
const DashboardUIContext = createContext<DashboardUIState | null>(null);

export interface DashboardProviderProps {
  dashboard: DashboardState;
  controller: DashboardUIState;
  children: ReactNode;
}

export function DashboardProvider({ dashboard, controller, children }: DashboardProviderProps) {
  return (
    <DashboardDataContext.Provider value={dashboard}>
      <DashboardUIContext.Provider value={controller}>
        {children}
      </DashboardUIContext.Provider>
    </DashboardDataContext.Provider>
  );
}

export function useDashboardDataCtx(): DashboardState {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error('useDashboardDataCtx must be used within DashboardProvider');
  return context;
}

export function useDashboardUICtx(): DashboardUIState {
  const context = useContext(DashboardUIContext);
  if (!context) throw new Error('useDashboardUICtx must be used within DashboardProvider');
  return context;
}
