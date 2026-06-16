import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { EmptyState } from '../../../components/shared/EmptyState.jsx';
import { KpiSubtext } from '../../../components/shared/KpiSubtext.jsx';
import { buildKpisFromSegments } from '../../../lib/kpiUtils.js';
import { formatDuration } from '../../../lib/durationFormatters.js';
import { initialKpiData } from '../../../lib/constants.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';

function buildAverageSheetKpiData(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const segmentsBySheet = new Map();

  safeSegments.forEach((segment) => {
    const sheetKey = String(segment.sheetKey || segment.documentId || `${segment.fileName || ''}::${segment.pageName || ''}`).trim();
    if (!sheetKey) return;
    if (!segmentsBySheet.has(sheetKey)) segmentsBySheet.set(sheetKey, []);
    segmentsBySheet.get(sheetKey).push(segment);
  });

  const perSheetKpis = Array.from(segmentsBySheet.values()).map((sheetSegments) => buildKpisFromSegments(sheetSegments));
  if (perSheetKpis.length === 0) return [];

  const average = (field) => Math.floor(
    perSheetKpis.reduce((sum, kpi) => sum + (Number(kpi?.[field]) || 0), 0) / perSheetKpis.length
  );
  const dashboardKpis = initialKpiData;

  return dashboardKpis.map((kpi) => {
    if (kpi.id === 7) {
      return {
        ...kpi,
        label: 'Avg Total time',
        value: formatDuration(average('totalLeadTimeSeconds')),
        subtext: '',
      };
    }
    if (kpi.id === 1) {
      return {
        ...kpi,
        label: 'Avg User Time',
        value: formatDuration(average('activeUserTimeSeconds')),
        subtext: '',
      };
    }
    if (kpi.id === 6) {
      return {
        ...kpi,
        label: 'Avg System Time',
        value: formatDuration(average('systemTimeSeconds')),
        subtext: '',
      };
    }
    if (kpi.id === 8) {
      return {
        ...kpi,
        label: 'Avg Idle Time',
        value: formatDuration(average('idleWaitingSeconds')),
        subtext: '',
      };
    }
    return {
      ...kpi,
      label: 'Avg Users',
      value: String(average('contributingUsers')),
      subtext: '',
    };
  });
}

function buildSheetPerformanceChartsData(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const segmentsBySheet = new Map();

  safeSegments.forEach((segment) => {
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) return;
    if (!segmentsBySheet.has(sheetKey)) {
      segmentsBySheet.set(sheetKey, {
        name: sheetName || fileName,
        segments: [],
      });
    }
    segmentsBySheet.get(sheetKey).segments.push(segment);
  });

  const entries = Array.from(segmentsBySheet.values()).map((entry) => {
    const kpis = buildKpisFromSegments(entry.segments);
    return {
      name: entry.name,
      totalLeadTimeSeconds: Number(kpis.totalLeadTimeSeconds) || 0,
      activeUserTimeSeconds: Number(kpis.activeUserTimeSeconds) || 0,
      systemTimeSeconds: Number(kpis.systemTimeSeconds) || 0,
      idleWaitingSeconds: Number(kpis.idleWaitingSeconds) || 0,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return {
    totalTimeData: entries.map(e => ({ name: e.name, value: e.totalLeadTimeSeconds })),
    userTimeData: entries.map(e => ({ name: e.name, value: e.activeUserTimeSeconds })),
    systemTimeData: entries.map(e => ({ name: e.name, value: e.systemTimeSeconds })),
    idleTimeData: entries.map(e => ({ name: e.name, value: e.idleWaitingSeconds })),
  };
}

export function SheetPerformanceView({ segments }) {
  const kpiData = React.useMemo(() => buildAverageSheetKpiData(segments), [segments]);
  const chartData = React.useMemo(() => buildSheetPerformanceChartsData(segments), [segments]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">Sheet Performance</h1>
          <p className="text-slate-500 mt-1">Detailed performance analysis breakdown by individual sheets and pages.</p>
        </div>
      </div>

      {kpiData.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No Data" subtitle="No sheet performance data available for the current filters." />
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1 sm:gap-3 lg:gap-6 2xl:gap-8 mb-10">
            {kpiData.map((kpi, idx) => (
              <div
                key={kpi.id}
                className={`relative min-w-0 bg-white px-0.5 py-1.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#d7e8f6] shadow-ktb text-center sm:text-left animate-stagger-${Math.min(idx + 1, 5)} cursor-default`}
              >
                <div className={`hidden sm:flex w-10 h-10 rounded-xl ${kpi.bg} items-center justify-center mb-4 relative z-10`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className="whitespace-nowrap overflow-visible sm:overflow-hidden sm:truncate tracking-tighter sm:tracking-normal text-[0.56rem] leading-tight sm:text-sm font-semibold mb-0.5 sm:mb-1 text-slate-500 relative z-10">{kpi.label}</div>
                <div className="min-w-0 whitespace-nowrap text-[0.72rem] leading-none sm:text-[1.4rem] lg:text-[2rem] 2xl:text-[2.1rem] font-extrabold text-[#17335f] relative z-10">{kpi.value}</div>
                <div className="hidden sm:block relative z-10 min-w-0">
                  <KpiSubtext text={kpi.subtext} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-1">
              <h2 className="text-lg font-bold mb-6 text-[#17335f]">Total Time</h2>
              <SheetBreakdownChart data={chartData.totalTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-2">
              <h2 className="text-lg font-bold mb-6 text-[#17335f]">User Time</h2>
              <SheetBreakdownChart data={chartData.userTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-3">
              <h2 className="text-lg font-bold mb-6 text-[#17335f]">System Time</h2>
              <SheetBreakdownChart data={chartData.systemTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-4">
              <h2 className="text-lg font-bold mb-6 text-[#17335f]">Idle Time</h2>
              <SheetBreakdownChart data={chartData.idleTimeData} isDuration={true} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
