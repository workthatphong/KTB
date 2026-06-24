import React, { Suspense, useRef, useEffect, useState } from 'react';
import { FileText, LayoutDashboard, Maximize2, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState.jsx';
import { useDashboardDataCtx, useDashboardUICtx } from '@/features/dashboard/contexts/DashboardContext.jsx';
import { ChartPanelFallback } from './ChartPanelFallback.jsx';
import { ToggleSetting } from './ToggleSetting.jsx';

const ganttTimelineChartPromise = import('../../../../timeline/GanttTimelineChart.jsx').then((m) => ({ default: m.GanttTimelineChart }));
const GanttTimelineChart = React.lazy(() => ganttTimelineChartPromise);

export const TimelinePanel = React.memo(() => {
  const dashboard = useDashboardDataCtx();
  const controller = useDashboardUICtx();
  const { ganttVisibleSegments, showIdle, setShowIdle, selectedFiles, selectedSheets } = dashboard;
  const { 
    ganttSingleLaneMode, setGanttSingleLaneMode,
    showSystemLane, setShowSystemLane,
    showStarMarkers,
    ganttCollapseGaps, setGanttCollapseGaps,
    showGanttLegend, setShowGanttLegend,
    ganttAllInPage, setGanttAllInPage,
    setExpandedVisualizationId
  } = controller;

  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [timelineNotice, setTimelineNotice] = useState('');
  const timelineFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) setShowTimelineFilterMenu(false);
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

  const visibleFileCount = selectedFiles && selectedFiles.length > 0 
    ? selectedFiles.length 
    : (dashboard.documentTree ? dashboard.documentTree.length : 0);

  let groupingMode = 'default';
  if (selectedSheets && selectedSheets.length > 1) {
    groupingMode = 'sheet';
  } else if (selectedSheets && selectedSheets.length === 1) {
    groupingMode = 'default';
  } else if (visibleFileCount === 1) {
    groupingMode = 'sheet';
  } else if (visibleFileCount > 1) {
    groupingMode = 'file';
  }

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb relative group animate-stagger-2 ${showTimelineFilterMenu ? 'z-[120]' : 'z-10'}`}>
      <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setExpandedVisualizationId('gantt-detail')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="View details"><FileText className="w-4 h-4" /></button>
        <div className="relative" ref={timelineFilterRef}>
          <button onClick={() => setShowTimelineFilterMenu(!showTimelineFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showTimelineFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
          {showTimelineFilterMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline Settings</div>
              <div className="space-y-3">
                {groupingMode !== 'default' ? (
                  <ToggleSetting checked={ganttAllInPage} onChange={() => setGanttAllInPage(!ganttAllInPage)}>All in page</ToggleSetting>
                ) : (
                  <>
                    <ToggleSetting checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)}>Merge User Lanes</ToggleSetting>
                    <ToggleSetting checked={showSystemLane} onChange={toggleSystemLane}>Show System Lane</ToggleSetting>
                    <ToggleSetting checked={showIdle} onChange={toggleIdleGaps}>Show Idle Gaps</ToggleSetting>
                    <ToggleSetting checked={ganttCollapseGaps} onChange={toggleCollapseGaps} notice={timelineNotice}>Collapse Time Gaps</ToggleSetting>
                    <ToggleSetting checked={showGanttLegend} onChange={() => setShowGanttLegend(!showGanttLegend)}>Show Legend</ToggleSetting>
                  </>
                )}
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
            onSelectSegment={() => {}}
            singleLane={ganttSingleLaneMode}
            showSystemLane={showSystemLane}
            showIdleLane={showIdle}
            showStarMarkers={showStarMarkers}
            collapseGaps={ganttCollapseGaps}
            showGanttLegend={groupingMode === 'default' ? showGanttLegend : false}
            groupingMode={groupingMode}
            allInPage={ganttAllInPage}
          />
        </Suspense>
      )}
    </div>
  );
});
