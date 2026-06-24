// @ts-nocheck
import React from 'react';
import { CHART_PALETTE } from '@/lib/constants';
import { safeNumber, formatDuration } from '@/lib/utils';

export const FlowDelayComparisonTable = ({ rows, maxVisibleRows = 0 }) => {
  const maxAvgSeconds = rows.reduce((max, row) => Math.max(max, safeNumber(row.avgSeconds)), 0) || 1;
  const rowSlotHeight = 78;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className={`space-y-2.5 ${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      {rows.map((row, idx) => {
        const avgSeconds = safeNumber(row.avgSeconds);
        const relative = avgSeconds <= 0 ? 0 : avgSeconds / maxAvgSeconds;
        const barWidth = avgSeconds <= 0 ? 0 : Math.max(4, Math.min(100, relative * 100));
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        return (
          <div key={row.id || row.label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                <div className="font-semibold text-slate-800 truncate">{row.label}</div>
              </div>
              <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatDuration(avgSeconds)} avg
              </div>
            </div>
            <div className="mt-2.5 px-1">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Min</span>
                <span>Max</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${barWidth}%`, backgroundColor: color }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
