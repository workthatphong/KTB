// @ts-nocheck
import React, { useMemo } from 'react';
import { buildAverageTransitionTimeData } from './utils/transitionMetrics';
import { buildChartAnimationKey, useProcessBreakdownData } from './components/dashboard-view/DashboardViewUtils';
import {
  KpiGridPanel,
  TimelinePanel,
  UserSharePanel,
  UserBreakdownPanel,
  ProcessTimePanel,
  TransitionTimePanel
} from './components/dashboard-view/DashboardViewPanels';
import { useDashboardDataCtx, useDashboardUICtx } from '@/features/dashboard/contexts/DashboardContext';

export const DashboardView = React.memo(() => {
  const dashboard = useDashboardDataCtx();
  const controller = useDashboardUICtx();

  const {
    kpiData,
    chartBaseSegments,
    contributionRows,
  } = dashboard;

  const {
    workloadVisibleRows,
    showProcessBreakdownIdle,
    mergeReviewAndEdit,
    mergeSpread,
  } = controller;

  const processBreakdownData = useProcessBreakdownData({
    chartBaseSegments,
    showProcessBreakdownIdle,
    mergeReviewAndEdit,
    mergeSpread
  });

  const transitionTimeData = useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments, {
      afterProcessing: 'First Spread',
      afterReprocessing: 'Second Spread',
      betweenReviewEdit: 'Review & Edit',
    });
  }, [chartBaseSegments]);

  const donutAnimationKey = useMemo(
    () => buildChartAnimationKey(workloadVisibleRows, ['totalSeconds', 'share']),
    [workloadVisibleRows]
  );

  const contributionAnimationKey = useMemo(
    () => buildChartAnimationKey(contributionRows, ['reviewSeconds', 'editDataSeconds', 'editMetaSeconds', 'totalSeconds', 'reworkRate']),
    [contributionRows]
  );

  const processBreakdownAnimationKey = useMemo(
    () => buildChartAnimationKey(processBreakdownData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [processBreakdownData]
  );

  const transitionAnimationKey = useMemo(
    () => buildChartAnimationKey(transitionTimeData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [transitionTimeData]
  );

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Comprehensive performance metrics and timeline analysis.</p>
        </div>
      </div>

      <KpiGridPanel kpiData={kpiData} />

      <TimelinePanel />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <UserSharePanel
          donutAnimationKey={donutAnimationKey}
        />
        <UserBreakdownPanel
          contributionAnimationKey={contributionAnimationKey}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProcessTimePanel
          processBreakdownData={processBreakdownData}
          processBreakdownAnimationKey={processBreakdownAnimationKey}
        />
        <TransitionTimePanel
          transitionTimeData={transitionTimeData}
          transitionAnimationKey={transitionAnimationKey}
        />
      </div>
    </div>
  );
});
