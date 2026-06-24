// @ts-nocheck
import React, { Suspense } from 'react';
import { FileText, Maximize2, Clock } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDashboardDataCtx, useDashboardUICtx } from '@/features/dashboard/contexts/DashboardContext';
import { ChartPanelFallback } from './ChartPanelFallback';

const processTimeBreakdownChartPromise = import('../../../../charts/ProcessTimeBreakdownChart').then((m) => ({ default: m.ProcessTimeBreakdownChart }));
const ProcessTimeBreakdownChart = React.lazy(() => processTimeBreakdownChartPromise);

export const TransitionTimePanel = React.memo(({ transitionTimeData, transitionAnimationKey }) => {
  const dashboard = useDashboardDataCtx();
  const controller = useDashboardUICtx();
  const { chartBaseSegments } = dashboard;
  const { setExpandedVisualizationId } = controller;

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[#17335f] whitespace-nowrap tracking-tighter sm:tracking-normal">Average Transition Time Breakdown</h2>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setExpandedVisualizationId('matrix-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details"><FileText className="w-4 h-4" /></button>
          <button onClick={() => setExpandedVisualizationId('matrix')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {chartBaseSegments.length === 0 ? <EmptyState icon={Clock} title="No Data" /> : (
          <Suspense fallback={<ChartPanelFallback />}>
            <ProcessTimeBreakdownChart key={transitionAnimationKey} data={transitionTimeData} showLabels />
          </Suspense>
        )}
      </div>
    </div>
  );
});
