import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  GANTT_MAX_TIMELINE_WIDTH_PX,
  GANTT_MAX_ZOOM_SCALE,
  GANTT_MIN_ZOOM_SCALE,
  GANTT_DRILL_GROUP_LABELS
} from '../../lib/constants.js';
import { mapSegmentsToRows } from './timelineUtils.js';
import { resolveBusinessAxisTimestamp } from '../dashboard/utils/segmentData.js';
import {
  buildGanttAxisAnchors,
  buildGanttDisplayBounds,
  buildGanttGapInfo,
  buildGanttLaneSegments,
  buildGanttLanes,
  buildGanttLegendItems,
  buildGanttPositionedBars,
  buildGanttTicks,
  compactGanttTimestamp,
  getGanttVisibleLaneWindow,
  interpolateGanttAxisX
} from './ganttLayoutUtils.js';
import {
  GanttBarsSvg,
  GanttHeader,
  GanttLaneLabels,
  GanttLegend,
  GanttTooltip
} from './GanttTimelineParts.jsx';

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
}) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const touchRef = useRef({
    mode: null,
    startX: 0,
    startScrollLeft: 0,
    startDistance: 0,
    startZoom: 1,
    anchorX: 0,
    anchorTime: 0,
  });
  const zoomScaleRef = useRef(1);
  const pendingZoomAnchorRef = useRef(null);
  const scrollRequestRef = useRef(null);
  const tooltipFrameRef = useRef(null);

  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewW: 1000, viewH: 600 });

  // Detect if device generally supports hover (for baseline capability)
  const supportsHover = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(hover: hover)').matches;
  }, []);

  const mapped = useMemo(() => mapSegmentsToRows(segments, singleLane), [segments, singleLane]);

  const axisBaseRawTs = useMemo(() => {
    if (mapped.length === 0) return null;
    const rawStarts = mapped
      .map((segment) => Number(segment.rawStartTs))
      .filter((value) => Number.isFinite(value));
    if (rawStarts.length === 0) return null;
    return Math.min(...rawStarts);
  }, [mapped]);

  const useBusinessAxisLabels = useMemo(
    () => mapped.some((segment) => (
      Number.isFinite(segment.rawStartTs)
      && Number.isFinite(segment.rawEndTs)
      && (segment.rawStartTs !== segment.startTs || segment.rawEndTs !== segment.endTs)
    )),
    [mapped]
  );

  const getLabelTs = useCallback((projectedTs) => {
    if (!useBusinessAxisLabels || !Number.isFinite(axisBaseRawTs)) return projectedTs;
    return resolveBusinessAxisTimestamp(axisBaseRawTs, projectedTs);
  }, [useBusinessAxisLabels, axisBaseRawTs]);

  useEffect(() => {
    const updateSize = () => {
      if (!bodyScrollRef.current) return;
      setScrollState((prev) => ({
        ...prev,
        viewW: bodyScrollRef.current.clientWidth,
        viewH: verticalScrollRef.current?.clientHeight || 600,
      }));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (bodyScrollRef.current) observer.observe(bodyScrollRef.current);
    if (verticalScrollRef.current) observer.observe(verticalScrollRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
      setScrollState((prev) => ({ ...prev, left: 0, top: 0 }));
    });
  }, [mapped.length]);

  const laneVisibleSegments = useMemo(() => mapped.filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, showSystemLane, showIdleLane]);

  const { displayMinTs, displayMaxTs } = useMemo(
    () => buildGanttDisplayBounds(laneVisibleSegments, mapped),
    [laneVisibleSegments, mapped]
  );

  const visibleSegments = useMemo(() => mapped.filter((segment) => {
    if (segment.endTs < displayMinTs || segment.startTs > displayMaxTs) return false;
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, displayMinTs, displayMaxTs, showSystemLane, showIdleLane]);

  const gapsInfo = useMemo(
    () => buildGanttGapInfo(collapseGaps, visibleSegments, displayMinTs, displayMaxTs),
    [collapseGaps, visibleSegments, displayMinTs, displayMaxTs]
  );

  const compactTs = useCallback(
    (realTs) => compactGanttTimestamp(realTs, gapsInfo.gaps),
    [gapsInfo]
  );

  const displaySpanMs = Math.max(displayMaxTs - displayMinTs - gapsInfo.totalExcess, 60000);
  const displaySpanHours = displaySpanMs / 3600000;
  const pxPerHour = 120;
  const legendItems = useMemo(
    () => buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers),
    [showIdleLane, showSystemLane, showStarMarkers]
  );

  const lanes = useMemo(
    () => buildGanttLanes(visibleSegments, showSystemLane, showIdleLane),
    [visibleSegments, showSystemLane, showIdleLane]
  );

  const laneToSegments = useMemo(
    () => buildGanttLaneSegments(lanes, visibleSegments),
    [lanes, visibleSegments]
  );

  const stackOverlapsInSingleLane = useMemo(() => {
    if (!singleLane || visibleSegments.length === 0) return false;
    const contextKeys = new Set(visibleSegments.map((segment) => segment.contextKey).filter(Boolean));
    return contextKeys.size === 1;
  }, [singleLane, visibleSegments]);

  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const minTimelinePx = collapseGaps ? (singleLane ? 2 : 2) : 2;
  const baseTimelineWidth = Math.min(120000, Math.max(minTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(GANTT_MAX_TIMELINE_WIDTH_PX, Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale)));
  const baseCompactedTs = useMemo(() => compactTs(displayMinTs), [compactTs, displayMinTs]);
  const pxPerMs = useMemo(() => timelineWidth / displaySpanMs, [timelineWidth, displaySpanMs]);

  const getX = useCallback((ts) => {
    const realTs = typeof ts === 'number' ? ts : Date.parse(String(ts));
    const normalizedTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    return timelinePadLeft + (compactTs(normalizedTs) - baseCompactedTs) * pxPerMs;
  }, [compactTs, displayMinTs, baseCompactedTs, pxPerMs]);

  const { positionedByLane: laneToPositionedBars, laneStackDepths } = useMemo(() => buildGanttPositionedBars({
    lanes,
    laneToSegments,
    singleLane,
    stackOverlapsInSingleLane,
    compactTs,
    displayMinTs,
    displayMaxTs,
    baseCompactedTs,
    pxPerMs,
    timelinePadLeft,
  }), [lanes, laneToSegments, singleLane, stackOverlapsInSingleLane, compactTs, displayMinTs, displayMaxTs, baseCompactedTs, pxPerMs]);

  const timelineSvgWidth = useMemo(() => {
    let maxRight = timelinePadLeft + timelineWidth + timelinePadRight;
    lanes.forEach((lane) => {
      const positionedBars = laneToPositionedBars[lane] || [];
      if (positionedBars.length > 0) {
        const last = positionedBars[positionedBars.length - 1];
        maxRight = Math.max(maxRight, last.x + last.w + timelinePadRight + 45);
      }
    });
    return maxRight;
  }, [lanes, laneToPositionedBars, timelineWidth]);

  const axisAnchors = useMemo(() => buildGanttAxisAnchors({
    lanes,
    laneToPositionedBars,
    displayMinTs,
    displayMaxTs,
    timelinePadLeft,
    timelineWidth,
    timelineSvgWidth,
  }), [lanes, laneToPositionedBars, displayMinTs, displayMaxTs, timelinePadLeft, timelineWidth, timelineSvgWidth]);

  const getAxisX = useCallback((ts) => interpolateGanttAxisX(ts, axisAnchors, getX), [axisAnchors, getX]);

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 639;
  const mobileLaneLabelWidth = useMemo(() => {
    if (typeof document === 'undefined' || lanes.length === 0) return 72;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 72;

    context.font = '600 10px "Krungthai Fast Regular", "Noto Sans Thai", "Segoe UI", Tahoma, Arial, sans-serif';
    const longestLaneWidth = lanes.reduce((max, lane) => {
      const measuredWidth = context.measureText(String(lane || '')).width;
      return Math.max(max, measuredWidth);
    }, 0);

    return Math.max(56, Math.ceil(longestLaneWidth + 16));
  }, [lanes]);
  const laneLabelWidth = isMobileViewport ? mobileLaneLabelWidth : (expanded ? 210 : 132);
  const headerHeight = 50;
  const laneBaseHeight = 34;
  const barHeight = laneBaseHeight - 8;
  const stackedBarGap = 4;
  const stackStep = barHeight + stackedBarGap;
  const rowGap = 10;
  const rowTopPadding = 8;
  const maxLaneStackDepth = useMemo(
    () => lanes.reduce((maxDepth, lane) => Math.max(maxDepth, laneStackDepths[lane] || 1), 1),
    [lanes, laneStackDepths]
  );
  const laneHeight = stackOverlapsInSingleLane
    ? laneBaseHeight + Math.max(0, maxLaneStackDepth - 1) * stackStep
    : laneBaseHeight;
  const rowSlotHeight = laneHeight + rowGap;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(7, lanes.length)) * rowSlotHeight + 12);

  const ticks = useMemo(() => buildGanttTicks({
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getTickX: getAxisX,
  }), [timelineWidth, displaySpanHours, displayMinTs, displayMaxTs, collapseGaps, visibleSegments, getAxisX]);

  const { startLaneIdx, endLaneIdx } = getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, lanes.length);
  const visibleLanes = lanes.slice(startLaneIdx, endLaneIdx + 1);
  const visibleTicks = ticks.filter((tick) => {
    const x = getAxisX(tick);
    return x >= scrollState.left - 200 && x <= scrollState.left + scrollState.viewW + 200;
  });

  const onBodyScroll = (event) => {
    const { scrollLeft } = event.currentTarget;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;

    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, left: scrollLeft }));
    });
  };

  const onVerticalScroll = (event) => {
    const { scrollTop } = event.currentTarget;
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, top: scrollTop }));
    });
  };

  const onDragStart = (event) => {
    if (!bodyScrollRef.current) return;
    dragRef.current = { active: true, startX: event.clientX, startScrollLeft: bodyScrollRef.current.scrollLeft };
  };

  const onDragMove = (event) => {
    if (!dragRef.current.active || !bodyScrollRef.current) return;
    bodyScrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX);
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  const onTouchStart = (event) => {
    if (!bodyScrollRef.current) return;

    if (event.touches.length >= 2) {
      const [touchA, touchB] = event.touches;
      const distance = Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
      const rect = bodyScrollRef.current.getBoundingClientRect();
      const anchorX = ((touchA.clientX + touchB.clientX) / 2) - rect.left;
      const absoluteX = bodyScrollRef.current.scrollLeft + anchorX;
      const anchorTime = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      touchRef.current = {
        mode: 'pinch',
        startX: 0,
        startScrollLeft: bodyScrollRef.current.scrollLeft,
        startDistance: Math.max(distance, 1),
        startZoom: zoomScaleRef.current,
        anchorX,
        anchorTime,
      };
    }
  };

  const onTouchMove = (event) => {
    if (!bodyScrollRef.current) return;

    if (touchRef.current.mode === 'pinch' && event.touches.length >= 2) {
      const [touchA, touchB] = event.touches;
      const distance = Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
      const ratio = Math.max(0.5, Math.min(3, distance / Math.max(touchRef.current.startDistance, 1)));
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, touchRef.current.startZoom * ratio)
      );

      pendingZoomAnchorRef.current = {
        anchorX: touchRef.current.anchorX,
        time: touchRef.current.anchorTime,
      };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    }
  };

  const onTouchEnd = (event) => {
    if (event.touches.length < 2) {
      touchRef.current.mode = null;
    }
  };

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const zoomIn = event.deltaY < 0;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, zoomScaleRef.current * (zoomIn ? 1.15 : 0.87))
      );
      if (Math.abs(nextZoom - zoomScaleRef.current) < 0.001) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const absoluteX = viewport.scrollLeft + anchorX;
      const time = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, time };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [timelineWidth, displaySpanMs, displayMinTs]);

  useLayoutEffect(() => {
    if (!pendingZoomAnchorRef.current || !bodyScrollRef.current) return;
    const { anchorX, time } = pendingZoomAnchorRef.current;
    const nextX = getX(time);
    bodyScrollRef.current.scrollLeft = nextX - anchorX;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale, getX]);

  const pickSegment = (segment) => {
    setHoveredSegment(null);
    if (typeof onSelectSegment === 'function') {
      onSelectSegment({
        ...segment,
        displayStart: new Date(getLabelTs(segment.startTs)).toISOString(),
        displayEnd: new Date(getLabelTs(segment.endTs)).toISOString(),
      });
    }
  };

  const showTooltip = (event, segment, lane, color) => {
    // Explicitly block tooltip for touch interactions (finger taps)
    // Pointer Events API: pointerType can be 'mouse', 'pen', or 'touch'
    if (event.pointerType === 'touch') {
      setHoveredSegment(null);
      return;
    }
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const resolvedStartTs = getLabelTs(segment.startTs);
    const resolvedEndTs = getLabelTs(segment.endTs);
    const displayLane = segment.origLane || lane;
    const nextHoveredSegment = {
      x: Math.max(8, Math.min(x + 12, rect.width - 318)),
      y: Math.max(8, Math.min(y + 12, rect.height - 132)),
      lane: displayLane,
      color,
      groupLabel: GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup,
      segmentType: segment.segmentType,
      start: new Date(resolvedStartTs).toISOString(),
      end: new Date(resolvedEndTs).toISOString(),
      durationSeconds: segment.durationSeconds,
    };

    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
    tooltipFrameRef.current = requestAnimationFrame(() => {
      setHoveredSegment((prev) => {
        if (
          prev &&
          prev.x === nextHoveredSegment.x &&
          prev.y === nextHoveredSegment.y &&
          prev.lane === nextHoveredSegment.lane &&
          prev.color === nextHoveredSegment.color &&
          prev.segmentType === nextHoveredSegment.segmentType &&
          prev.start === nextHoveredSegment.start &&
          prev.end === nextHoveredSegment.end &&
          prev.durationSeconds === nextHoveredSegment.durationSeconds
        ) {
          return prev;
        }
        return nextHoveredSegment;
      });
    });
  };

  useEffect(() => () => {
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
  }, []);

  if (mapped.length === 0) return null;

  return (
    <div className="space-y-2 relative select-none" ref={containerRef}>
      {showGanttLegend && <GanttLegend items={legendItems} />}

      <div className="rounded-xl bg-slate-50/30 border border-slate-200 overflow-hidden shadow-sm">
        <GanttHeader
          laneLabelWidth={laneLabelWidth}
          headerScrollRef={headerScrollRef}
          timelineSvgWidth={timelineSvgWidth}
          headerHeight={headerHeight}
          visibleTicks={visibleTicks}
          getTickX={getAxisX}
          getLabelTs={getLabelTs}
        />

        <div
          ref={verticalScrollRef}
          onScroll={onVerticalScroll}
          className="overflow-y-auto no-scrollbar"
          style={{ maxHeight: timelineViewportHeight }}
        >
          <div className="flex min-w-0" style={{ height: bodyChartHeight }}>
            <GanttLaneLabels
              visibleLanes={visibleLanes}
              lanes={lanes}
              laneLabelWidth={laneLabelWidth}
              rowTopPadding={rowTopPadding}
              rowSlotHeight={rowSlotHeight}
              laneHeight={laneHeight}
            />

            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchEnd}
              onMouseLeave={() => { onDragEnd(); setHoveredSegment(null); }}
              className="flex-1 overflow-x-auto no-scrollbar cursor-default"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              <GanttBarsSvg
                timelineSvgWidth={timelineSvgWidth}
                bodyChartHeight={bodyChartHeight}
                visibleTicks={visibleTicks}
                visibleLanes={visibleLanes}
                lanes={lanes}
                laneToPositionedBars={laneToPositionedBars}
                rowTopPadding={rowTopPadding}
                rowSlotHeight={rowSlotHeight}
                barHeight={barHeight}
                stackStep={stackStep}
                scrollState={scrollState}
                showStarMarkers={showStarMarkers}
                getTickX={getAxisX}
                onPickSegment={pickSegment}
                onShowTooltip={showTooltip}
                onHideTooltip={() => setHoveredSegment(null)}
                supportsHover={supportsHover}
              />
            </div>
          </div>
        </div>
      </div>

      <GanttTooltip hoveredSegment={hoveredSegment} containerRef={containerRef} />
    </div>
  );
};
