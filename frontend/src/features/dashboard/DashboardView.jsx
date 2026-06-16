import React, { Suspense, lazy, useEffect, useRef, useState, memo } from 'react';
import { FileText, LayoutDashboard, Maximize2, RefreshCw, Search, SlidersHorizontal, Users, Clock } from 'lucide-react';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { KpiSubtext } from '../../components/shared/KpiSubtext.jsx';
import { GANTT_DRILL_GROUP_COLORS } from '../../lib/constants.js';
import { toDrillGroup } from '../../lib/segmentUtils.js';
import { buildAverageTransitionTimeData } from './utils/transitionMetrics.js';

function buildChartAnimationKey(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) return 'empty';
  return rows.map((row, index) => {
    const rowId = row.id || row.key || row.label || row.name || row.user || `row-${index}`;
    const values = fields.map((field) => String(row?.[field] ?? ''));
    return `${rowId}:${values.join(':')}`;
  }).join('|');
}

const donutWorkloadChartPromise = import('../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart }));
const userContributionStackChartPromise = import('../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart }));
const ganttTimelineChartPromise = import('../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart }));
const processTimeBreakdownChartPromise = import('../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart }));

const DonutWorkloadChart = lazy(() => donutWorkloadChartPromise);
const UserContributionStackChart = lazy(() => userContributionStackChartPromise);
const GanttTimelineChart = lazy(() => ganttTimelineChartPromise);
const ProcessTimeBreakdownChart = lazy(() => processTimeBreakdownChartPromise);

function ChartPanelFallback({ height = 'min-h-[320px]' }) {
  return <div className={`w-full rounded-2xl bg-slate-100 animate-pulse ${height}`} />;
}

function ToggleSetting({ checked, onChange, children, notice }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group relative">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-[#00a4e4]' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{children}</span>
      {notice && (
        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-bounce-in z-20">
          {notice}
        </div>
      )}
    </label>
  );
}

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
    chartBaseSegments.forEach(s => {
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
            { label: 'First Spread', seconds: totals.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing },
            { label: 'Second Spread', seconds: totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Reprocessing },
          ]),
        { label: 'Review & Edit', seconds: mergedReviewEdit, color: '#F59E0B' },
      ];
    } else {
      const labelMap = { Processing: 'First Spread', Reprocess: 'Second Spread' };
      items = Object.entries(totals)
        .filter(([label]) => label !== 'Idle')
        .map(([label, seconds]) => ({
          label: labelMap[label] || label,
          seconds,
          color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
        }));
      if (mergeSpread) {
        const mergedItems = [];
        let spreadInserted = false;
        items.forEach((item) => {
          if (item.label === 'First Spread' || item.label === 'Second Spread') {
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
  }, [chartBaseSegments, mergeReviewAndEdit, mergeSpread, showProcessBreakdownIdle]);

  const transitionTimeData = React.useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments, {
      afterProcessing: 'First Spread',
      afterReprocessing: 'Second Spread',
      betweenReviewEdit: 'Review & Edit',
    });
  }, [chartBaseSegments]);

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

  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const [showProcessFilterMenu, setShowProcessFilterMenu] = useState(false);
  const [timelineNotice, setTimelineNotice] = useState('');

  const timelineFilterRef = useRef(null);
  const workloadFilterRef = useRef(null);
  const processFilterRef = useRef(null);
  const matrixFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) setShowTimelineFilterMenu(false);
      if (workloadFilterRef.current && !workloadFilterRef.current.contains(event.target)) setShowWorkloadFilterMenu(false);
      if (processFilterRef.current && !processFilterRef.current.contains(event.target)) setShowProcessFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!timelineNotice) return undefined;
    const timer = setTimeout(() => setTimelineNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [timelineNotice]);

  const toggleSystemLane = () => {
    const nextValue = !showSystemLane;
    setShowSystemLane(nextValue);
    if (nextValue && showIdle && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleIdleGaps = () => {
    const nextValue = !showIdle;
    setShowIdle(nextValue);
    if (nextValue && showSystemLane && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleCollapseGaps = () => {
    if (!ganttCollapseGaps && showSystemLane && showIdle) {
      setTimelineNotice('Cannot collapse gaps when both System and Idle lanes are visible');
      return;
    }
    setGanttCollapseGaps(!ganttCollapseGaps);
  };

  const handleKpiClick = (kpiId) => {
    // KPI interaction removed as requested
  };
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Comprehensive performance metrics and timeline analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-3 lg:gap-6 2xl:gap-8 mb-10">
        {kpiData.map((kpi, idx) => {
          return (
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
          );
        })}
      </div>

      <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb relative group animate-stagger-2 ${showTimelineFilterMenu ? 'z-[120]' : 'z-10'}`}>
        <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setExpandedVisualizationId('gantt-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details"><FileText className="w-4 h-4" /></button>
          <div className="relative" ref={timelineFilterRef}>
            <button onClick={() => setShowTimelineFilterMenu(!showTimelineFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showTimelineFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
            {showTimelineFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline Settings</div>
                <div className="space-y-3">
                  <ToggleSetting checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)}>Merge User Lanes</ToggleSetting>
                  <ToggleSetting checked={showSystemLane} onChange={toggleSystemLane}>Show System Lane</ToggleSetting>
                  <ToggleSetting checked={showIdle} onChange={toggleIdleGaps}>Show Idle Gaps</ToggleSetting>
                  <ToggleSetting checked={ganttCollapseGaps} onChange={toggleCollapseGaps} notice={timelineNotice}>Collapse Time Gaps</ToggleSetting>
                  <ToggleSetting checked={showGanttLegend} onChange={() => setShowGanttLegend(!showGanttLegend)}>Show Legend</ToggleSetting>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setExpandedVisualizationId('gantt')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
        <h2 className="text-lg font-bold mb-6 text-[#17335f]">Timeline</h2>
        {ganttVisibleSegments.length === 0 ? <EmptyState icon={LayoutDashboard} title="No Data" /> : (
          <Suspense fallback={<ChartPanelFallback height="h-[28rem]" />}>
            <GanttTimelineChart
              segments={ganttVisibleSegments}
              onSelectSegment={setSelectedGanttSegment}
              singleLane={ganttSingleLaneMode}
              showSystemLane={showSystemLane}
              showIdleLane={showIdle}
              showStarMarkers={showStarMarkers}
              collapseGaps={ganttCollapseGaps}
              showGanttLegend={showGanttLegend}
            />
          </Suspense>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
      </div>
    </div>
  );
});
