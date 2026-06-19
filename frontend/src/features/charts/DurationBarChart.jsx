import React from 'react';
import { CHART_PALETTE } from '@/lib/constants.js';
import { safeNumber, clampPercent } from '@/lib/utils.js';

export const DurationBarChart = React.memo(({ rows, maxVisibleRows = 0 }) => {
  const maxValue = rows.reduce((max, row) => Math.max(max, safeNumber(row.value)), 0) || 1;
  const rowSlotHeight = 66;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;
  return (
    <div className={`space-y-3 ${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      {rows.map((row, idx) => {
        const rawValue = safeNumber(row.value);
        const rowMin = Number.isFinite(Number(row.minValue)) ? safeNumber(row.minValue) : null;
        const rowMax = Number.isFinite(Number(row.maxValue)) ? safeNumber(row.maxValue) : null;
        const hasRangeScale = rowMin !== null && rowMax !== null && rowMax >= rowMin;
        let width = rawValue <= 0 ? 0 : clampPercent(Math.max((rawValue / maxValue) * 100, 2));
        if (hasRangeScale) {
          const range = Math.max(0, rowMax - rowMin);
          if (range === 0) {
            width = rawValue > 0 ? 100 : 0;
          } else {
            const ratio = (rawValue - rowMin) / range;
            width = clampPercent(Math.max(2, ratio * 100));
          }
        }
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        return (
          <div key={row.id || row.label} className="py-2">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="font-medium text-slate-700 truncate">{row.label}</div>
              <div className="text-slate-500 whitespace-nowrap">{row.valueLabel}</div>
            </div>
            <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${width}%`, backgroundColor: color }}></div>
            </div>
            {row.meta ? <div className="mt-1 text-xs text-slate-500">{row.meta}</div> : null}
          </div>
        );
      })}
    </div>
  );
});
