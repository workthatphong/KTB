// @ts-nocheck
import React from 'react';
import { safeNumber, formatDuration } from '@/lib/utils.js';

export const SystemProcessingTrendChart = ({ rows }) => {
  if (!rows || rows.length === 0) return null;

  const width = 760;
  const height = 280;
  const margin = { top: 20, right: 20, bottom: 52, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxSeriesSeconds = rows.reduce((max, row) => Math.max(max, safeNumber(row.p90Seconds), safeNumber(row.avgSeconds)), 0) || 1;
  const maxSeconds = Math.max(maxSeriesSeconds, 1);
  const xStep = rows.length > 1 ? innerWidth / (rows.length - 1) : innerWidth / 2;
  const y = (seconds) => margin.top + (1 - (safeNumber(seconds) / maxSeconds)) * innerHeight;
  const x = (idx) => margin.left + (rows.length > 1 ? idx * xStep : innerWidth / 2);
  const avgPoints = rows.map((row, idx) => `${x(idx)},${y(row.avgSeconds)}`).join(' ');
  const p90Points = rows.map((row, idx) => `${x(idx)},${y(row.p90Seconds)}`).join(' ');
  const xLabelStep = rows.length > 10 ? Math.ceil(rows.length / 6) : 1;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block">
        {yTicks.map((tick) => {
          const lineY = margin.top + (1 - tick) * innerHeight;
          return (
            <g key={`tick-${tick}`}>
              <line x1={margin.left} x2={width - margin.right} y1={lineY} y2={lineY} stroke="#E2E8F0" strokeDasharray={tick === 0 ? '0' : '3 3'} />
              <text x={margin.left - 8} y={lineY + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                {formatDuration(maxSeconds * tick)}
              </text>
            </g>
          );
        })}

        <polyline points={p90Points} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={avgPoints} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {rows.map((row, idx) => (
          <g key={row.id || row.dateLabel}>
            <circle cx={x(idx)} cy={y(row.p90Seconds)} r="3.2" fill="#2563EB">
              <title>{`${row.dateLabel} | Slow-case ${formatDuration(row.p90Seconds)} | Average ${formatDuration(row.avgSeconds)} | ${row.docCount} docs`}</title>
            </circle>
            <circle cx={x(idx)} cy={y(row.avgSeconds)} r="3.2" fill="#06B6D4">
              <title>{`${row.dateLabel} | Slow-case ${formatDuration(row.p90Seconds)} | Average ${formatDuration(row.avgSeconds)} | ${row.docCount} docs`}</title>
            </circle>
            {idx % xLabelStep === 0 || idx === rows.length - 1 ? (
              <text x={x(idx)} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {row.dateLabel}
              </text>
            ) : null}
          </g>
        ))}

        <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[11px]">Date</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>Average Time</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>Slow-Case Time (Worst 10%)</span>
      </div>
    </div>
  );
};
