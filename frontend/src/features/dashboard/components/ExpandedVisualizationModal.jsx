import React, { Suspense, lazy } from 'react';
import { X } from 'lucide-react';
import { buildAverageTransitionTimeData } from '@/features/dashboard/utils/transitionMetrics.js';

import { EditDataBubbleChart } from '@/features/charts/EditDataBubbleChart.jsx';
import { SheetBreakdownChart } from '@/features/charts/SheetBreakdownChart.jsx';

import { TimelineDetailView } from './expanded-views/TimelineDetailView.jsx';
import { UserShareDetailView } from './expanded-views/UserShareDetailView.jsx';
import { UserBreakdownDetailView } from './expanded-views/UserBreakdownDetailView.jsx';
import { TimeBreakdownDetailView } from './expanded-views/TimeBreakdownDetailView.jsx';
import { TransitionBreakdownDetailView } from './expanded-views/TransitionBreakdownDetailView.jsx';
import { KpiBreakdownView } from './expanded-views/KpiBreakdownView.jsx';

import { ExpandedChartFallback } from './expanded-modal-utils/ExpandedChartFallback.jsx';
import { getModalTitle, getModalSubtitle } from './expanded-modal-utils/modalContentHelpers.js';
import { useSheetPerformanceData } from './expanded-modal-utils/useSheetPerformanceData.js';
import { useProcessBreakdownData } from './expanded-modal-utils/useProcessBreakdownData.js';
import { useChartAnimationKeys } from './expanded-modal-utils/useChartAnimationKeys.js';

const ganttTimelineChartPromise = import('../../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart }));
const donutWorkloadChartPromise = import('../../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart }));
const userContributionStackChartPromise = import('../../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart }));
const processTimeBreakdownChartPromise = import('../../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart }));

const GanttTimelineChart = lazy(() => ganttTimelineChartPromise);
const DonutWorkloadChart = lazy(() => donutWorkloadChartPromise);
const UserContributionStackChart = lazy(() => userContributionStackChartPromise);
const ProcessTimeBreakdownChart = lazy(() => processTimeBreakdownChartPromise);

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const isKpiBreakdown = visualizationId.startsWith('kpi-breakdown-');
  const isSheetBreakdownFullView = visualizationId === 'sheet-total-time'
    || visualizationId === 'sheet-user-time'
    || visualizationId === 'sheet-system-time'
    || visualizationId === 'sheet-idle-time'
    || visualizationId === 'sheet-edit-data-relationship';
  const kpiId = isKpiBreakdown ? visualizationId.replace('kpi-breakdown-', '') : '';

  const modalTitle = getModalTitle(visualizationId, kpiId);
  const modalSubtitle = getModalSubtitle(visualizationId, kpiId);

  const {
    ganttVisibleSegments,
    chartBaseSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    workloadVisibleRows,
    contributionRows,
    mergeReviewAndEdit,
    mergeSpread,
    sheetPerformanceSegments,
    sheetPerformanceUnfilteredSegments,
    sheetPerformanceChartSettings,
    setSelectedGanttSegment,
    timelineSettings,
  } = data;

  const {
    sheetPerformanceChartData,
    unfilteredSheetPerformanceChartData,
    sortedSheetPerformanceChartData,
    userTimeAppearance,
    isSheetUserTimeCountMode,
    totalTimeAppearance,
    systemTimeAppearance,
    idleTimeAppearance
  } = useSheetPerformanceData(sheetPerformanceSegments, sheetPerformanceUnfilteredSegments, sheetPerformanceChartSettings);

  const processBreakdownData = useProcessBreakdownData(
    ganttVisibleSegments,
    chartBaseSegments,
    mergeReviewAndEdit,
    mergeSpread,
    showProcessBreakdownIdle
  );

  const transitionTimeData = React.useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments || ganttVisibleSegments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review And Edit',
    });
  }, [ganttVisibleSegments, chartBaseSegments]);

  const {
    donutAnimationKey,
    contributionAnimationKey,
    processBreakdownAnimationKey,
    transitionAnimationKey
  } = useChartAnimationKeys({
    workloadVisibleRows,
    contributionRows,
    processBreakdownData,
    transitionTimeData
  });

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 md:p-8 viz-overlay-enter overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white w-full h-full sm:max-w-[95vw] sm:h-[92vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden viz-panel-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 md:px-10 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#17335f] truncate">{modalTitle}</h2>
            <p className="text-[9px] sm:text-sm text-slate-500 font-bold uppercase tracking-wider truncate">{modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl sm:rounded-2xl transition-all hover:rotate-90 duration-300 shrink-0">
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto no-scrollbar min-w-0 ${isSheetBreakdownFullView ? 'p-3 sm:px-6 sm:pb-6 sm:pt-4 md:px-8 md:pb-8 md:pt-4' : 'p-4 sm:p-6 md:p-10'}`}>
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'gantt' && (
              <GanttTimelineChart
                segments={ganttVisibleSegments}
                onSelectSegment={setSelectedGanttSegment}
                expanded
                singleLane={timelineSettings?.singleLane}
                showSystemLane={timelineSettings?.showSystemLane}
                showIdleLane={timelineSettings?.showIdleLane}
                showStarMarkers={timelineSettings?.showStarMarkers}
                collapseGaps={timelineSettings?.collapseGaps}
                showGanttLegend={timelineSettings?.groupingMode === 'default' ? timelineSettings?.showGanttLegend : false}
                groupingMode={timelineSettings?.groupingMode}
                allInPage={timelineSettings?.allInPage}
              />
            )}
            {visualizationId === 'donut' && <DonutWorkloadChart key={donutAnimationKey} rows={workloadVisibleRows} expanded />}
          </Suspense>
          {visualizationId === 'gantt-detail' && <TimelineDetailView segments={ganttVisibleSegments} timelineSettings={timelineSettings} />}
          {visualizationId === 'donut-detail' && (
            <UserShareDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              workloadVisibleRows={workloadVisibleRows}
            />
          )}
          {visualizationId === 'contribution-detail' && (
            <UserBreakdownDetailView rows={contributionRows} segments={chartBaseSegments || ganttVisibleSegments} />
          )}
          {visualizationId === 'process-breakdown-detail' && (
            <TimeBreakdownDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              selectedSegmentTypes={selectedSegmentTypes}
              showProcessBreakdownIdle={showProcessBreakdownIdle}
              mergeReviewAndEdit={mergeReviewAndEdit}
              mergeSpread={mergeSpread}
            />
          )}
          {visualizationId === 'matrix-detail' && (
            <TransitionBreakdownDetailView segments={ganttVisibleSegments} />
          )}
          {isKpiBreakdown && (
            <KpiBreakdownView kpiId={kpiId} segments={chartBaseSegments || ganttVisibleSegments} expanded />
          )}
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart key={processBreakdownAnimationKey} data={processBreakdownData} showLabels />}
            {visualizationId === 'contribution' && <UserContributionStackChart key={contributionAnimationKey} rows={contributionRows} expanded />}
            {visualizationId === 'matrix' && <ProcessTimeBreakdownChart key={transitionAnimationKey} data={transitionTimeData} showLabels />}
            {visualizationId === 'sheet-total-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.totalTimeData}
                isDuration
                expanded
                showAverageLine={sheetPerformanceChartSettings?.totalTime?.showAverageLine !== false}
                activeFill={totalTimeAppearance?.activeFill}
                inactiveFill={totalTimeAppearance?.inactiveFill}
                valueLabelFill={totalTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-user-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.userTimeData}
                isDuration={!isSheetUserTimeCountMode}
                expanded
                showAverageLine={sheetPerformanceChartSettings?.userTime?.showAverageLine !== false}
                activeFill={userTimeAppearance?.activeFill}
                inactiveFill={userTimeAppearance?.inactiveFill}
                valueLabelFill={userTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-system-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.systemTimeData}
                isDuration
                expanded
                showAverageLine={sheetPerformanceChartSettings?.systemTime?.showAverageLine !== false}
                activeFill={systemTimeAppearance?.activeFill}
                inactiveFill={systemTimeAppearance?.inactiveFill}
                valueLabelFill={systemTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-idle-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.idleTimeData}
                isDuration
                expanded
                showAverageLine={sheetPerformanceChartSettings?.idleTime?.showAverageLine !== false}
                activeFill={idleTimeAppearance?.activeFill}
                inactiveFill={idleTimeAppearance?.inactiveFill}
                valueLabelFill={idleTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-edit-data-relationship' && (
              <EditDataBubbleChart
                data={sheetPerformanceChartData.editDataBubbleData}
                unfilteredData={unfilteredSheetPerformanceChartData.editDataBubbleData}
                expanded
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
});
