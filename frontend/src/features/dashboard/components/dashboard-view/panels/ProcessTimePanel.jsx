import React, { Suspense, useRef, useEffect, useState } from 'react';
import { FileText, Maximize2, SlidersHorizontal, Clock } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState.jsx';
import { useDashboardDataCtx, useDashboardUICtx } from '@/contexts/DashboardContext.jsx';
import { ChartPanelFallback } from './ChartPanelFallback.jsx';
import { ToggleSetting } from './ToggleSetting.jsx';

const processTimeBreakdownChartPromise = import('../../../../charts/ProcessTimeBreakdownChart.jsx').then((m) => ({ default: m.ProcessTimeBreakdownChart }));
const ProcessTimeBreakdownChart = React.lazy(() => processTimeBreakdownChartPromise);

export const ProcessTimePanel = React.memo(({
  processBreakdownData,
  processBreakdownAnimationKey,
}) => {
  const dashboard = useDashboardDataCtx();
  const controller = useDashboardUICtx();
  const { chartBaseSegments } = dashboard;
  const { 
    mergeReviewAndEdit, setMergeReviewAndEdit,
    mergeSpread, setMergeSpread,
    setExpandedVisualizationId
  } = controller;

  const [showProcessFilterMenu, setShowProcessFilterMenu] = useState(false);
  const processFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (processFilterRef.current && !processFilterRef.current.contains(event.target)) setShowProcessFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4 ${showProcessFilterMenu ? 'z-[120]' : 'z-10'}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[#17335f]">Time Breakdown</h2>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setExpandedVisualizationId('process-breakdown-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details"><FileText className="w-4 h-4" /></button>
          <div className="relative" ref={processFilterRef}>
            <button onClick={() => setShowProcessFilterMenu(!showProcessFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showProcessFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
            {showProcessFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Process Settings</div>
                <div className="space-y-3">
                  <ToggleSetting checked={mergeReviewAndEdit} onChange={() => setMergeReviewAndEdit(!mergeReviewAndEdit)}>Merge Review & Edit</ToggleSetting>
                  <ToggleSetting checked={mergeSpread} onChange={() => setMergeSpread(!mergeSpread)}>Merge Spread</ToggleSetting>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setExpandedVisualizationId('process-breakdown')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {chartBaseSegments.length === 0 ? <EmptyState icon={Clock} title="No Data" /> : (
          <Suspense fallback={<ChartPanelFallback />}>
            <ProcessTimeBreakdownChart key={processBreakdownAnimationKey} data={processBreakdownData} showLabels />
          </Suspense>
        )}
      </div>
    </div>
  );
});
