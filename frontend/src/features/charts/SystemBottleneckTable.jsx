import React from 'react';
import { safeNumber, clampPercent, formatDuration } from '../../lib/utils.js';

export const SystemBottleneckTable = ({ rows, maxVisibleRows = 6 }) => {
  if (!rows || rows.length === 0) return null;
  const slotHeight = 70;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * slotHeight}px` } : undefined;
  const maxTotal = rows.reduce((max, row) => Math.max(max, safeNumber(row.totalSeconds)), 0) || 1;

  return (
    <div className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const share = clampPercent((safeNumber(row.totalSeconds) / maxTotal) * 100);
          return (
            <div key={row.id || row.documentLabel} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{idx + 1}. {row.documentLabel}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    Processing {formatDuration(row.processingSeconds)} | Repeat {formatDuration(row.reprocessSeconds)} | Waiting {formatDuration(row.waitingSeconds)}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">{formatDuration(row.totalSeconds)}</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#2563EB] transition-[width] duration-500 ease-out" style={{ width: `${Math.max(4, share)}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
