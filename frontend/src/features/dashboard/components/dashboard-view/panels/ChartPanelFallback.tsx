// @ts-nocheck
import React from 'react';

export function ChartPanelFallback({ height = 'min-h-[320px]' }) {
  return <div className={`w-full rounded-2xl bg-slate-100 animate-pulse ${height}`} />;
}
