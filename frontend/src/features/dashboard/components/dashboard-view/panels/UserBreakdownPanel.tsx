// @ts-nocheck
import React, { Suspense } from 'react';
import { FileText, Maximize2, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDashboardDataCtx, useDashboardUICtx } from '@/features/dashboard/contexts/DashboardContext';
import { ChartPanelFallback } from './ChartPanelFallback';

const userContributionStackChartPromise = import('../../../../charts/UserContributionStackChart').then((m) => ({ default: m.UserContributionStackChart }));
const UserContributionStackChart = React.lazy(() => userContributionStackChartPromise);

export const UserBreakdownPanel = React.memo(({ contributionAnimationKey }) => {
  const dashboard = useDashboardDataCtx();
  const controller = useDashboardUICtx();
  const { contributionRows } = dashboard;
  const { setExpandedVisualizationId } = controller;

  return (
    <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#17335f]">User Breakdown</h2>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setExpandedVisualizationId('contribution-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => setExpandedVisualizationId('contribution')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="Full view"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : (
          <Suspense fallback={<ChartPanelFallback />}>
            <UserContributionStackChart key={contributionAnimationKey} rows={contributionRows} maxVisibleRows={3} />
          </Suspense>
        )}
      </div>
    </div>
  );
});
