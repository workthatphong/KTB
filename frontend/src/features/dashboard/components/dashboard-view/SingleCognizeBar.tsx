// @ts-nocheck
import React, { useState } from 'react';
import { formatDuration, formatPercent, clampPercent } from '@/lib/utils';

export const SingleCognizeBar = React.memo(({ data, displayMetric = 'avg', isDuration = true }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const { cognizeSeconds, othersSeconds, totalSeconds } = data;
  if (totalSeconds === 0) return null;

  const cognizePercent = clampPercent((cognizeSeconds / totalSeconds) * 100);
  const othersPercent = clampPercent((othersSeconds / totalSeconds) * 100);

  const isHovering = hoveredSegment !== null;
  let tooltipData = null;
  let tooltipLeft = 0;

  const isPercentDisplay = displayMetric === 'pct_total' || displayMetric === 'pct_avg';
  
  const formatValue = (val) => isDuration ? formatDuration(val) : `${val.toLocaleString()} items`;
  const displayValCognize = isPercentDisplay ? formatPercent(cognizeSeconds / totalSeconds) : formatValue(cognizeSeconds);
  const displayValOthers = isPercentDisplay ? formatPercent(othersSeconds / totalSeconds) : formatValue(othersSeconds);

  if (hoveredSegment === 'cognize') {
    tooltipData = {
      label: 'Cognize',
      value: displayValCognize,
      percent: formatPercent(cognizeSeconds / totalSeconds),
      color: '#00a4e4'
    };
    tooltipLeft = cognizePercent / 2;
  } else if (hoveredSegment === 'others') {
    tooltipData = {
      label: 'Maker',
      value: displayValOthers,
      percent: formatPercent(othersSeconds / totalSeconds),
      color: '#F59E0B'
    };
    tooltipLeft = cognizePercent + (othersPercent / 2);
  }

  return (
    <div className="mt-2">
      {/* Labels */}
      <div className="flex justify-between items-center text-sm font-bold text-[#17335f] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#00a4e4]"></span>
          Cognize
        </div>
        <div className="flex items-center gap-2">
          Maker
          <span className="w-3 h-3 rounded-sm bg-[#F59E0B]"></span>
        </div>
      </div>

      {/* Bar and Tooltip Wrapper */}
      <div className="relative w-full">
        {/* Tooltip */}
        {isHovering && tooltipData && (
          <div 
            className="absolute bottom-full mb-3 z-[200] pointer-events-none transition-all duration-200 ease-out"
            style={{ 
              left: `${tooltipLeft}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-[180px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2 mb-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: tooltipData.color, boxShadow: `0 0 10px ${tooltipData.color}66` }}
                />
                <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
                  {tooltipData.label}
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="uppercase tracking-wider">Value</span>
                  <span className="text-[#00a4e4] text-[13px] font-bold">{tooltipData.value}</span>
                </div>
                {!isPercentDisplay && (
                  <div className="flex justify-between items-center">
                    <span className="uppercase tracking-wider">Portion</span>
                    <span className="text-slate-600 font-medium">{tooltipData.percent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Bar */}
        <div className="h-8 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner flex relative">
          <div 
            onMouseEnter={() => setHoveredSegment('cognize')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#00a4e4] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 flex items-center justify-center overflow-hidden ${hoveredSegment === 'others' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${cognizePercent}%` }}
          >
            {cognizePercent > 10 && (
              <span className="text-white text-[11px] font-bold px-2 truncate">
                {displayValCognize}
              </span>
            )}
          </div>
          <div 
            onMouseEnter={() => setHoveredSegment('others')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#F59E0B] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 flex items-center justify-center overflow-hidden ${hoveredSegment === 'cognize' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${othersPercent}%` }}
          >
            {othersPercent > 10 && (
              <span className="text-white text-[11px] font-bold px-2 truncate">
                {displayValOthers}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
