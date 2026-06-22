import React, { useMemo } from 'react';
import { SystemProcessingTrendChart } from '@/features/charts/SystemProcessingTrendChart.jsx';
import { SystemParetoChart } from '@/features/charts/SystemParetoChart.jsx';
import { FlowDelayComparisonTable } from '@/features/charts/FlowDelayComparisonTable.jsx';
import { SystemBottleneckTable } from '@/features/charts/SystemBottleneckTable.jsx';
import { safeNumber } from '@/lib/utils.js';

function systemPerformancePercentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function buildSystemRows(segments) {
  const byDate = new Map();
  const byDocument = new Map();

  segments.forEach((segment) => {
    const durationSeconds = safeNumber(segment.durationSeconds);
    if (durationSeconds <= 0) return;

    const segmentType = String(segment.segmentType || '');
    const dateLabel = String(segment.start || '').slice(0, 10) || 'Unknown';
    if (!byDate.has(dateLabel)) byDate.set(dateLabel, []);
    byDate.get(dateLabel).push(durationSeconds);

    const documentLabel = segment.documentLabel || segment.fileName || segment.documentId || 'Unknown Document';
    if (!byDocument.has(documentLabel)) {
      byDocument.set(documentLabel, {
        id: documentLabel,
        documentLabel,
        processingSeconds: 0,
        reprocessSeconds: 0,
        waitingSeconds: 0,
        totalSeconds: 0,
      });
    }

    const row = byDocument.get(documentLabel);
    if (segmentType.includes('REPROCESS')) row.reprocessSeconds += durationSeconds;
    else if (segmentType.startsWith('SYSTEM_')) row.processingSeconds += durationSeconds;
    else if (segmentType.startsWith('IDLE_')) row.waitingSeconds += durationSeconds;
    row.totalSeconds += durationSeconds;
  });

  return {
    trendRows: Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dateLabel, values]) => ({
      id: dateLabel,
      dateLabel,
      avgSeconds: values.reduce((sum, value) => sum + value, 0) / values.length,
      p90Seconds: systemPerformancePercentile(values, 0.9),
      docCount: values.length,
    })),
    bottleneckRows: Array.from(byDocument.values()).sort((a, b) => b.totalSeconds - a.totalSeconds),
  };
}

export function SystemPerformanceView({ segments, flowRows }) {
  const { trendRows, bottleneckRows } = useMemo(() => buildSystemRows(segments), [segments]);
  const comparisonRows = useMemo(() => (
    flowRows.map((row) => ({
      ...row,
      id: row.transitionKey,
      label: row.transitionLabel,
    }))
  ), [flowRows]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-stagger-1">
        <h2 className="text-lg font-bold mb-6">Processing Trend</h2>
        <SystemProcessingTrendChart rows={trendRows} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-stagger-2">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Pareto Analysis</h2>
          <SystemParetoChart rows={bottleneckRows} />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Flow Comparison</h2>
          <FlowDelayComparisonTable rows={comparisonRows} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-stagger-3">
        <h2 className="text-lg font-bold mb-6">System Bottlenecks</h2>
        <SystemBottleneckTable rows={bottleneckRows} />
      </div>
    </div>
  );
}
