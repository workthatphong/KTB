import React, { useMemo } from 'react';
import { buildAverageTransitionTimeData } from './utils/transitionMetrics.js';
import { buildChartAnimationKey, useProcessBreakdownData } from './components/dashboard-view/DashboardViewUtils.js';
import {
  KpiGridPanel,
  TimelinePanel,
  UserSharePanel,
  UserBreakdownPanel,
  ProcessTimePanel,
  TransitionTimePanel
} from './components/dashboard-view/DashboardViewPanels.jsx';

export const DashboardView = React.memo(({
  dashboard,
  workloadVisibleRows,
  showProcessBreakdownIdle,
  setShowProcessBreakdownIdle,
  mergeReviewAndEdit,
  setMergeReviewAndEdit,
  mergeSpread,
  setMergeSpread,
  ganttSingleLaneMode,
  setGanttSingleLaneMode,
  showSystemLane,
  setShowSystemLane,
  showStarMarkers,
  ganttCollapseGaps,
  setGanttCollapseGaps,
  showGanttLegend,
  setShowGanttLegend,
  setSelectedGanttSegment,
  setExpandedVisualizationId,
}) => {
  const {
    kpiData,
    ganttVisibleSegments,
    chartBaseSegments,
    contributionRows,
    showIdle,
    setShowIdle,
    showWorkloadIdle,
    setShowWorkloadIdle,
    showWorkloadSystem,
    setShowWorkloadSystem,
  } = dashboard;

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

      <TimelinePanel
        ganttVisibleSegments={ganttVisibleSegments}
        ganttSingleLaneMode={ganttSingleLaneMode} setGanttSingleLaneMode={setGanttSingleLaneMode}
        showSystemLane={showSystemLane} setShowSystemLane={setShowSystemLane}
        showIdle={showIdle} setShowIdle={setShowIdle}
        showStarMarkers={showStarMarkers}
        ganttCollapseGaps={ganttCollapseGaps} setGanttCollapseGaps={setGanttCollapseGaps}
        showGanttLegend={showGanttLegend} setShowGanttLegend={setShowGanttLegend}
        setSelectedGanttSegment={setSelectedGanttSegment}
        setExpandedVisualizationId={setExpandedVisualizationId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <UserSharePanel
          workloadVisibleRows={workloadVisibleRows}
          setExpandedVisualizationId={setExpandedVisualizationId}
          donutAnimationKey={donutAnimationKey}
        />
        <UserBreakdownPanel
          contributionRows={contributionRows}
          setExpandedVisualizationId={setExpandedVisualizationId}
          contributionAnimationKey={contributionAnimationKey}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProcessTimePanel
          chartBaseSegments={chartBaseSegments}
          processBreakdownData={processBreakdownData}
          processBreakdownAnimationKey={processBreakdownAnimationKey}
          mergeReviewAndEdit={mergeReviewAndEdit} setMergeReviewAndEdit={setMergeReviewAndEdit}
          mergeSpread={mergeSpread} setMergeSpread={setMergeSpread}
          setExpandedVisualizationId={setExpandedVisualizationId}
        />
        <TransitionTimePanel
          chartBaseSegments={chartBaseSegments}
          transitionTimeData={transitionTimeData}
          transitionAnimationKey={transitionAnimationKey}
          setExpandedVisualizationId={setExpandedVisualizationId}
        />
      </div>
    </div>
  );
});
