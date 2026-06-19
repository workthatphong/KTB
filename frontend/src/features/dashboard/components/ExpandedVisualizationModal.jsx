import React, { Suspense, lazy } from 'react';
import { ChevronDown, Clock, User, X } from 'lucide-react';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { buildAverageTransitionTimeData, buildTransitionBreakdownGroups } from '../utils/transitionMetrics.js';
import {
  isIdleContextSegment,
  isProcessingEquivalentIdleSegment,
  mergeContinuousReprocessingSegments,
  toDrillGroup,
  toGanttSegmentTypeLabel,
  toTimelineLane
} from '../../../lib/segmentUtils.js';
import {
  formatDuration,
  toDisplayDate,
} from '../../../lib/utils.js';
import { mapSegmentsToRows } from '../../timeline/timelineUtils.js';
import { toSegmentGroup } from '../utils/segmentData.js';
import {
  buildSheetPerformanceChartsData,
  getTotalTimeChartAppearance,
  getUserTimeChartAppearance,
  getSystemTimeChartAppearance,
  getIdleTimeChartAppearance,
  isUserTimeCountMode,
  selectUserTimeChartData,
  selectTotalTimeChartData,
  selectSystemTimeChartData,
  selectIdleTimeChartData,
  sortSheetPerformanceChartData
} from '../utils/sheetPerformanceCharts.js';
import { EditDataBubbleChart } from '../../charts/EditDataBubbleChart.jsx';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';

const ganttTimelineChartPromise = import('../../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart }));
const donutWorkloadChartPromise = import('../../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart }));
const userContributionStackChartPromise = import('../../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart }));
const processTimeBreakdownChartPromise = import('../../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart }));

const GanttTimelineChart = lazy(() => ganttTimelineChartPromise);
const DonutWorkloadChart = lazy(() => donutWorkloadChartPromise);
const UserContributionStackChart = lazy(() => userContributionStackChartPromise);
const ProcessTimeBreakdownChart = lazy(() => processTimeBreakdownChartPromise);

function ExpandedChartFallback() {
  return <div className="min-h-[420px] w-full rounded-[2rem] bg-slate-100 animate-pulse" />;
}

function buildChartAnimationKey(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) return 'empty';
  return rows.map((row, index) => {
    const rowId = row.id || row.key || row.label || row.name || row.user || `row-${index}`;
    const values = fields.map((field) => String(row?.[field] ?? ''));
    return `${rowId}:${values.join(':')}`;
  }).join('|');
}

import { TimelineDetailView } from './expanded-views/TimelineDetailView.jsx';
import { UserShareDetailView } from './expanded-views/UserShareDetailView.jsx';
import { UserBreakdownDetailView } from './expanded-views/UserBreakdownDetailView.jsx';
import { TimeBreakdownDetailView } from './expanded-views/TimeBreakdownDetailView.jsx';
import { TransitionBreakdownDetailView } from './expanded-views/TransitionBreakdownDetailView.jsx';
import { KpiBreakdownView } from './expanded-views/KpiBreakdownView.jsx';

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const isKpiBreakdown = visualizationId.startsWith('kpi-breakdown-');
  const isSheetBreakdownFullView = visualizationId === 'sheet-total-time'
    || visualizationId === 'sheet-user-time'
    || visualizationId === 'sheet-system-time'
    || visualizationId === 'sheet-idle-time'
    || visualizationId === 'sheet-edit-data-relationship';
  const kpiId = isKpiBreakdown ? visualizationId.replace('kpi-breakdown-', '') : '';

  const modalTitle = isKpiBreakdown
    ? `KPI Breakdown: ${
        kpiId === '7' ? 'Total Time' :
        kpiId === '1' ? 'User Time' :
        kpiId === '6' ? 'System Time' :
        kpiId === '8' ? 'Idle Time' :
        kpiId === '2' ? 'Contributing Users' : 'Performance Metric'
      }`
    : visualizationId === 'gantt-detail'
    ? 'Timeline Source Details'
    : visualizationId === 'donut-detail'
    ? 'Visualization Source Details'
    : visualizationId === 'contribution-detail'
      ? 'User Breakdown Details'
      : visualizationId === 'process-breakdown-detail'
      ? 'Time Breakdown Details'
      : visualizationId === 'matrix-detail'
        ? 'Average Transition Time Details'
      : visualizationId === 'sheet-total-time'
        ? 'Total Time By Sheet'
      : visualizationId === 'sheet-user-time'
        ? 'User Time By Sheet'
      : visualizationId === 'sheet-system-time'
        ? 'System Time By Sheet'
      : visualizationId === 'sheet-idle-time'
        ? 'Idle Time By Sheet'
      : visualizationId === 'sheet-edit-data-relationship'
        ? 'Editing Risk By Sheet'
      : 'Full View Analysis';
      const modalSubtitle = isKpiBreakdown
      ? `Breakdown of ${
      kpiId === '7' ? 'Lead Time' :
      kpiId === '1' ? 'Active User Sessions' :
      kpiId === '6' ? 'System Processing' :
      kpiId === '8' ? 'Idle Waiting' :
      kpiId === '2' ? 'Unique Contributors' : 'Selected Metric'
      } By Sheet`
      : visualizationId === 'gantt-detail'
      ? 'Bars Counted From Interval Segments Only'
      : visualizationId === 'donut-detail'
      ? 'User Activity Timeline'
      : visualizationId === 'contribution-detail'
      ? 'Review And Edit Summary'
      : visualizationId === 'process-breakdown-detail'
      ? 'Grouped By Y-Axis Labels'
      : visualizationId === 'matrix-detail'
        ? 'Average Transition Source Rows'
      : visualizationId === 'sheet-total-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-user-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-system-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-idle-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-edit-data-relationship'
        ? 'X = Edit Data Time, Y = Edit Data Items, Bubble Size = Review Count'
      : 'Advanced Visualization';

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

  const sheetPerformanceChartData = React.useMemo(
    () => buildSheetPerformanceChartsData(sheetPerformanceSegments),
    [sheetPerformanceSegments]
  );
  const unfilteredSheetPerformanceChartData = React.useMemo(
    () => buildSheetPerformanceChartsData(sheetPerformanceUnfilteredSegments || []),
    [sheetPerformanceUnfilteredSegments]
  );
  const sortedSheetPerformanceChartData = React.useMemo(() => ({
    totalTimeData: sortSheetPerformanceChartData(selectTotalTimeChartData(sheetPerformanceChartData.totalTimeData, sheetPerformanceChartSettings?.totalTime?.mode), sheetPerformanceChartSettings?.totalTime?.sortOrder),
    userTimeData: sortSheetPerformanceChartData(selectUserTimeChartData(sheetPerformanceChartData.userTimeData, sheetPerformanceChartSettings?.userTime?.mode), sheetPerformanceChartSettings?.userTime?.sortOrder),
    systemTimeData: sortSheetPerformanceChartData(selectSystemTimeChartData(sheetPerformanceChartData.systemTimeData, sheetPerformanceChartSettings?.systemTime?.mode), sheetPerformanceChartSettings?.systemTime?.sortOrder),
    idleTimeData: sortSheetPerformanceChartData(selectIdleTimeChartData(sheetPerformanceChartData.idleTimeData, sheetPerformanceChartSettings?.idleTime?.mode), sheetPerformanceChartSettings?.idleTime?.sortOrder),
  }), [sheetPerformanceChartData, sheetPerformanceChartSettings]);

  const userTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.userTime?.mode && sheetPerformanceChartSettings.userTime.mode !== 'all'
      ? getUserTimeChartAppearance(sheetPerformanceChartSettings.userTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );
  const isSheetUserTimeCountMode = React.useMemo(
    () => isUserTimeCountMode(sheetPerformanceChartSettings?.userTime?.mode),
    [sheetPerformanceChartSettings]
  );
  const totalTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.totalTime?.mode && sheetPerformanceChartSettings.totalTime.mode !== 'all'
      ? getTotalTimeChartAppearance(sheetPerformanceChartSettings.totalTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );
  const systemTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.systemTime?.mode && sheetPerformanceChartSettings.systemTime.mode !== 'all'
      ? getSystemTimeChartAppearance(sheetPerformanceChartSettings.systemTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );
  const idleTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.idleTime?.mode && sheetPerformanceChartSettings.idleTime.mode !== 'all'
      ? getIdleTimeChartAppearance(sheetPerformanceChartSettings.idleTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );

  const processBreakdownData = React.useMemo(() => {
    const totals = {
      Uploading: 0,
      Processing: 0,
      Reprocess: 0,
      Review: 0,
      EditData: 0,
      EditMeta: 0,
      Idle: 0,
    };
    const sourceSegments = chartBaseSegments || ganttVisibleSegments;
    sourceSegments.forEach(s => {
      const drillGroup = toDrillGroup(s.segmentType);
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'EditData') totals.EditData += duration;
      else if (drillGroup === 'EditMeta') totals.EditMeta += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });

    let items = [];
    if (mergeReviewAndEdit) {
      const mergedReviewEdit = totals.Review + totals.EditData + totals.EditMeta;
      items = [
        { label: 'Uploading', seconds: totals.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading },
        ...(mergeSpread
          ? [{ label: 'Spread', seconds: totals.Processing + totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Processing }]
          : [
            { label: 'Processing', seconds: totals.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing },
            { label: 'Reprocess', seconds: totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Reprocessing },
          ]),
        { label: 'Review And Edit', seconds: mergedReviewEdit, color: '#F59E0B' },
      ];
    } else {
      items = Object.entries(totals)
        .filter(([label]) => label !== 'Idle')
        .map(([label, seconds]) => ({
          label,
          seconds,
          color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
        }));
      if (mergeSpread) {
        const mergedItems = [];
        let spreadInserted = false;
        items.forEach((item) => {
          if (item.label === 'Processing' || item.label === 'Reprocess') {
            if (!spreadInserted) {
              mergedItems.push({
                label: 'Spread',
                seconds: totals.Processing + totals.Reprocess,
                color: GANTT_DRILL_GROUP_COLORS.Processing,
              });
              spreadInserted = true;
            }
            return;
          }
          mergedItems.push(item);
        });
        items = mergedItems;
      }
    }

    const completeSeconds = (
      totals.Uploading
      + totals.Processing
      + totals.Reprocess
      + totals.Review
      + totals.EditData
      + totals.EditMeta
    );
    if (completeSeconds > 0) {
      items.push({
        label: 'Complete',
        seconds: completeSeconds,
        color: '#16A34A'
      });
    }
    return items;
  }, [ganttVisibleSegments, chartBaseSegments, mergeReviewAndEdit, mergeSpread, showProcessBreakdownIdle]);

  const transitionTimeData = React.useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments || ganttVisibleSegments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review And Edit',
    });
  }, [ganttVisibleSegments, chartBaseSegments]);

  const donutAnimationKey = React.useMemo(
    () => buildChartAnimationKey(workloadVisibleRows, ['totalSeconds', 'share']),
    [workloadVisibleRows]
  );

  const contributionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(contributionRows, ['reviewSeconds', 'editDataSeconds', 'editMetaSeconds', 'totalSeconds', 'reworkRate']),
    [contributionRows]
  );

  const processBreakdownAnimationKey = React.useMemo(
    () => buildChartAnimationKey(processBreakdownData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [processBreakdownData]
  );

  const transitionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(transitionTimeData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [transitionTimeData]
  );

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
                showGanttLegend={timelineSettings?.showGanttLegend}
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
