import React, { useMemo, useRef, useState } from 'react';
import { getGanttVisibleLaneWindow } from './ganttLayoutUtils.js';
import {
  GanttBarsSvg,
  GanttHeader,
  GanttLaneLabels,
  GanttLegend,
  GanttTooltip
} from './GanttTimelineParts.jsx';

import { useGanttLayout } from './hooks/useGanttLayout.js';
import { useGanttEvents } from './hooks/useGanttEvents.js';
import { useGanttTooltip } from './hooks/useGanttTooltip.js';

export const GanttTimelineChart = ({
  segments,
  onSelectSegment,
  expanded = false,
  singleLane = false,
  showSystemLane = true,
  showIdleLane = true,
  showStarMarkers = true,
  collapseGaps = false,
  showGanttLegend = true,
  groupingMode = 'default',
  allInPage = false,
}) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewW: 1000, viewH: 600 });

  // Detect if device generally supports hover (for baseline capability)
  const supportsHover = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(hover: hover)').matches;
  }, []);

  const layout = useGanttLayout({
    segments,
    singleLane,
    showSystemLane,
    showIdleLane,
    collapseGaps,
    showStarMarkers,
    zoomScale,
    groupingMode,
    allInPage,
    containerWidth: scrollState.viewW
  });

  const events = useGanttEvents({
    containerRef,
    headerScrollRef,
    bodyScrollRef,
    verticalScrollRef,
    zoomScale,
    setZoomScale,
    setScrollState,
    displayMinTs: layout.displayMinTs,
    timelineWidth: layout.timelineWidth,
    displaySpanMs: layout.displaySpanMs,
    getX: layout.getX,
    mappedLength: layout.mapped.length
  });

  const tooltip = useGanttTooltip({
    containerRef,
    visibleSegments: layout.visibleSegments,
    getLabelTs: layout.getLabelTs,
    onSelectSegment
  });

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 639;
  const mobileLaneLabelWidth = useMemo(() => {
    if (typeof document === 'undefined' || layout.lanes.length === 0) return 72;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 72;

    context.font = '600 10px "Krungthai Fast Regular", "Noto Sans Thai", "Segoe UI", Tahoma, Arial, sans-serif';
    const longestLaneWidth = layout.lanes.reduce((max, lane) => {
      const measuredWidth = context.measureText(String(lane || '')).width;
      return Math.max(max, measuredWidth);
    }, 0);

    return Math.max(56, Math.ceil(longestLaneWidth + 16));
  }, [layout.lanes]);

  const laneLabelWidth = isMobileViewport ? mobileLaneLabelWidth : (expanded ? 210 : 132);
  const headerHeight = 50;
  const laneBaseHeight = 34;
  const barHeight = laneBaseHeight - 8;
  const stackedBarGap = 4;
  const stackStep = barHeight + stackedBarGap;
  const rowGap = 10;
  const rowTopPadding = 8;
  
  const maxLaneStackDepth = useMemo(
    () => layout.lanes.reduce((maxDepth, lane) => Math.max(maxDepth, layout.laneStackDepths[lane] || 1), 1),
    [layout.lanes, layout.laneStackDepths]
  );
  
  const laneHeight = layout.stackOverlapsInSingleLane
    ? laneBaseHeight + Math.max(0, maxLaneStackDepth - 1) * stackStep
    : laneBaseHeight;
  const rowSlotHeight = laneHeight + rowGap;
  const bodyChartHeight = rowTopPadding + layout.lanes.length * rowSlotHeight + 10;
  
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, layout.lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(7, layout.lanes.length)) * rowSlotHeight + 12);

  const { startLaneIdx, endLaneIdx } = getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, layout.lanes.length);
  const visibleLanes = layout.lanes.slice(startLaneIdx, endLaneIdx + 1);
  const visibleTicks = layout.ticks.filter((tick) => {
    const x = layout.getAxisX(tick);
    return x >= scrollState.left - 200 && x <= scrollState.left + scrollState.viewW + 200;
  });

  if (layout.mapped.length === 0) return null;

  return (
    <div className="space-y-2 relative select-none" ref={containerRef}>
      {showGanttLegend && <GanttLegend items={layout.legendItems} />}

      <div className="rounded-xl bg-slate-50/30 border border-slate-200 overflow-hidden shadow-sm">
        <GanttHeader
          laneLabelWidth={laneLabelWidth}
          headerScrollRef={headerScrollRef}
          timelineSvgWidth={layout.timelineSvgWidth}
          headerHeight={headerHeight}
          visibleTicks={visibleTicks}
          getTickX={layout.getAxisX}
          getLabelTs={layout.getLabelTs}
        />

        <div
          ref={verticalScrollRef}
          onScroll={events.onVerticalScroll}
          className="overflow-y-auto no-scrollbar"
          style={{ maxHeight: timelineViewportHeight }}
        >
          <div className="flex min-w-0" style={{ height: bodyChartHeight }}>
            <GanttLaneLabels
              visibleLanes={visibleLanes}
              lanes={layout.lanes}
              laneLabelWidth={laneLabelWidth}
              rowTopPadding={rowTopPadding}
              rowSlotHeight={rowSlotHeight}
              laneHeight={laneHeight}
            />

            <div
              ref={bodyScrollRef}
              onScroll={events.onBodyScroll}
              onMouseDown={events.onDragStart}
              onMouseMove={events.onDragMove}
              onMouseUp={events.onDragEnd}
              onTouchStart={events.onTouchStart}
              onTouchMove={events.onTouchMove}
              onTouchEnd={events.onTouchEnd}
              onTouchCancel={events.onTouchEnd}
              onMouseLeave={() => { events.onDragEnd(); tooltip.hideTooltip(); }}
              className="flex-1 overflow-x-auto no-scrollbar cursor-default"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              <GanttBarsSvg
                timelineSvgWidth={layout.timelineSvgWidth}
                bodyChartHeight={bodyChartHeight}
                visibleTicks={visibleTicks}
                visibleLanes={visibleLanes}
                lanes={layout.lanes}
                laneToPositionedBars={layout.laneToPositionedBars}
                rowTopPadding={rowTopPadding}
                rowSlotHeight={rowSlotHeight}
                barHeight={barHeight}
                stackStep={stackStep}
                scrollState={scrollState}
                showStarMarkers={showStarMarkers}
                getTickX={layout.getAxisX}
                onPickSegment={tooltip.pickSegment}
                onShowTooltip={tooltip.showTooltip}
                onHideTooltip={tooltip.hideTooltip}
                supportsHover={supportsHover}
              />
            </div>
          </div>
        </div>
      </div>

      <GanttTooltip hoveredSegment={tooltip.hoveredSegment} containerRef={containerRef} />
    </div>
  );
};
