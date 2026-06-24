import React from 'react';
import { createPortal } from 'react-dom';
import { formatDuration } from '@/lib/utils.js';
import { formatTimeTick } from '@/lib/dateFormatters.js';

export function clampLabel(label, maxLength = 12) {
  const text = String(label || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

export function DurationBarLabel({ x, y, width, height, value, index, data, isDuration, average, fillColor, isDiffChart, isButterflyChart }) {
  if (value === undefined || value === null || (value === 0 && !isDiffChart && !isButterflyChart)) return null;
  if (typeof x !== 'number' || isNaN(x) || typeof y !== 'number' || isNaN(y)) return null;
  
  if (!isDiffChart && !isButterflyChart && value < average) return null;

  let customFill = data?.[index]?.fill || fillColor;
  if (isButterflyChart) {
    customFill = value < 0 ? data?.[index]?.leftFill : data?.[index]?.rightFill;
  }

  const isNegative = value < 0;
  const tipX = isNegative ? x - Math.abs(width) - 8 : x + Math.abs(width) + 8;
  const textAnchor = isNegative ? "end" : "start";

  const displayValue = (isDiffChart || isButterflyChart) ? Math.abs(value) : value;
  let text = isDuration ? formatDuration(displayValue) : displayValue.toLocaleString();
  
  if (isDiffChart && value !== 0) {
    const logicalValue = data?.[index]?.logicalDiff !== undefined ? data[index].logicalDiff : value;
    text = (logicalValue > 0 ? '+' : '-') + text;
  }

  return (
    <text
      x={tipX}
      y={y + height / 2 + 4}
      textAnchor={textAnchor}
      fill={customFill}
      className="text-[11px] font-bold"
    >
      {text}
    </text>
  );
}

export const CustomTooltip = ({ active, payload, label, isDuration, isDiffChart, isButterflyChart, coordinate, scrollAreaRef }) => {
  if (active && payload && payload.length && coordinate && scrollAreaRef.current) {
    const svgElement = scrollAreaRef.current.querySelector('svg');
    if (!svgElement) return null;

    const svgRect = svgElement.getBoundingClientRect();
    
    const left = svgRect.left + coordinate.x + 10;
    const top = svgRect.top + coordinate.y - 60;

    const payloadObj = payload[0]?.payload;
    const startTs = payloadObj?.startTs !== undefined ? payloadObj.startTs : payload[0]?.startTs;
    const endTs = payloadObj?.endTs !== undefined ? payloadObj.endTs : payload[0]?.endTs;

    if (isButterflyChart) {
      const leftValObj = payload.find(p => p.dataKey === 'leftValue');
      const rightValObj = payload.find(p => p.dataKey === 'rightValue');
      
      const leftVal = leftValObj ? Math.abs(Number(leftValObj.value) || 0) : Math.abs(Number(payloadObj?.leftValue) || 0);
      const rightVal = rightValObj ? Math.abs(Number(rightValObj.value) || 0) : Math.abs(Number(payloadObj?.rightValue) || 0);

      const leftText = isDuration ? formatDuration(leftVal) : leftVal.toLocaleString();
      const rightText = isDuration ? formatDuration(rightVal) : rightVal.toLocaleString();

      return createPortal(
        <div 
          className="fixed pointer-events-none bg-white p-3 border border-slate-200 shadow-2xl rounded-xl z-[99999] min-w-[200px]"
          style={{ left: `${left}px`, top: `${top}px` }}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1.5 text-xs font-bold">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-500">Doc 1 (Left):</span>
              <span style={{ color: leftVal > rightVal ? '#22c55e' : '#64748b' }}>{leftText}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-500">Doc 2 (Right):</span>
              <span style={{ color: rightVal > leftVal ? '#ef4444' : '#64748b' }}>{rightText}</span>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    const value = payloadObj?.value !== undefined ? payloadObj.value : payload[0]?.value;
    const logicalValue = payloadObj?.logicalDiff !== undefined ? payloadObj.logicalDiff : value;

    return createPortal(
      <div 
        className="fixed pointer-events-none bg-white p-3 border border-slate-200 shadow-2xl rounded-xl z-[99999]"
        style={{ left: `${left}px`, top: `${top}px` }}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-lg font-extrabold text-[#17335f]">
          {isDiffChart && value !== 0 ? (logicalValue > 0 ? '+' : '-') : ''}
          {isDuration ? formatDuration(Math.abs(value)) : Math.abs(value).toLocaleString()}
        </p>
        {(startTs || endTs) && (
          <div className="mt-2 text-xs text-slate-500 font-medium">
            {startTs && <div>Start: {formatTimeTick(startTs)}</div>}
            {endTs && <div>End: {formatTimeTick(endTs)}</div>}
          </div>
        )}
      </div>,
      document.body
    );
  }
  return null;
};
