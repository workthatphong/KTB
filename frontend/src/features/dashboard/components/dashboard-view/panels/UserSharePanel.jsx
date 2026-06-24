import React, { Suspense } from 'react';
import { FileText, Maximize2, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState.jsx';
import { useDashboardUICtx } from '@/contexts/DashboardContext.jsx';
import { ChartPanelFallback } from './ChartPanelFallback.jsx';

const donutWorkloadChartPromise = import('../../../../charts/DonutWorkloadChart.jsx').then((m) => ({ default: m.DonutWorkloadChart }));
const DonutWorkloadChart = React.lazy(() => donutWorkloadChartPromise);

export const UserSharePanel = React.memo(({ donutAnimationKey }) => {
  const controller = useDashboardUICtx();
  const { workloadVisibleRows, setExpandedVisualizationId } = controller;

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
      <div className="absolute right-4 top-4 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setExpandedVisualizationId('donut-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details">
          <FileText className="w-4 h-4" />
        </button>
        <button onClick={() => setExpandedVisualizationId('donut')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="Full view"><Maximize2 className="w-4 h-4" /></button>
      </div>
      <h2 className="text-lg font-bold mb-4 text-[#17335f]">User Share</h2>
      <div className="flex-1 min-h-0">
        {workloadVisibleRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : (
          <Suspense fallback={<ChartPanelFallback />}>
            <DonutWorkloadChart key={donutAnimationKey} rows={workloadVisibleRows} />
          </Suspense>
        )}
      </div>
    </div>
  );
});
