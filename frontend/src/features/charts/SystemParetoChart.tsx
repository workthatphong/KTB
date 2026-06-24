// @ts-nocheck
import React from 'react';
import { safeNumber, formatDuration, formatPercent } from '@/lib/utils';

export const SystemParetoChart = ({ rows, maxBars = 8 }) => {
  if (!rows || rows.length === 0) return null;

  const bars = rows.slice(0, Math.max(1, maxBars));
  const totalSeconds = bars.reduce((sum, row) => sum + safeNumber(row.totalSeconds), 0) || 1;
  const maxSeconds = bars.reduce((max, row) => Math.max(max, safeNumber(row.totalSeconds)), 0) || 1;
  const width = 760;
  const height = 320;
  const margin = { top: 20, right: 52, bottom: 78, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const step = innerWidth / bars.length;
  const barWidth = Math.min(58, step * 0.62);
  const yLeft = (seconds) => margin.top + (1 - (safeNumber(seconds) / maxSeconds)) * innerHeight;
  const yRight = (ratio) => margin.top + (1 - Math.max(0, Math.min(1, safeNumber(ratio)))) * innerHeight;

  let cumulative = 0;
  const prepared = bars.map((row, idx) => {
    const seconds = safeNumber(row.totalSeconds);
    cumulative += seconds;
    return {
      ...row,
      idx,
      seconds,
      cumulativeShare: cumulative / totalSeconds,
      x: margin.left + idx * step + (step / 2),
      barX: margin.left + idx * step + (step - barWidth) / 2,
    };
  });
  const linePoints = prepared.map((row) => `${row.x},${yRight(row.cumulativeShare)}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block">
        {yTicks.map((tick) => {
          const lineY = margin.top + (1 - tick) * innerHeight;
          return (
            <g key={`pareto-tick-${tick}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={lineY}
                y2={lineY}
                stroke="#E2E8F0"
                strokeDasharray={tick === 0 ? '0' : '3 3'}
              />
              <text x={margin.left - 8} y={lineY + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                {formatDuration(maxSeconds * tick)}
              </text>
              <text x={width - margin.right + 8} y={lineY + 4} textAnchor="start" className="fill-slate-500 text-[10px]">
                {`${Math.round(tick * 100)}%`}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={yRight(0.8)}
          y2={yRight(0.8)}
          stroke="#F59E0B"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
        <text x={width - margin.right} y={yRight(0.8) - 6} textAnchor="end" className="fill-amber-600 text-[10px] font-semibold">
          80% Focus Line
        </text>

        {prepared.map((row) => (
          <rect
            key={`${row.id || row.documentLabel}-bar`}
            x={row.barX}
            y={yLeft(row.seconds)}
            width={barWidth}
            height={Math.max(2, margin.top + innerHeight - yLeft(row.seconds))}
            rx="4"
            fill="#2563EB"
          >
            <title>{`${row.documentLabel} | ${formatDuration(row.seconds)} (${formatPercent(row.seconds / totalSeconds)})`}</title>
          </rect>
        ))}

        <polyline points={linePoints} fill="none" stroke="#0EA5E9" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {prepared.map((row) => (
          <g key={`${row.id || row.documentLabel}-point`}>
            <circle cx={row.x} cy={yRight(row.cumulativeShare)} r="3.2" fill="#0EA5E9">
              <title>{`${row.documentLabel} | Cumulative ${formatPercent(row.cumulativeShare)}`}</title>
            </circle>
            <text x={row.x} y={height - 20} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {`#${row.idx + 1}`}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]"></span>
          Document Delay
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          Cumulative Share
        </span>
      </div>
    </div>
  );
};
