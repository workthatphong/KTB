// @ts-nocheck
import { useMemo, useCallback } from 'react';
import { GANTT_MAX_TIMELINE_WIDTH_PX } from '@/lib/constants';
import { mapSegmentsToRows } from '@/features/timeline/timelineUtils';
import { resolveBusinessAxisTimestamp } from '@/features/dashboard/utils/segmentData';
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
  interpolateGanttAxisX
} from '../ganttLayoutUtils';

export function useGanttLayout({
  segments,
  singleLane,
  showSystemLane,
  showIdleLane,
  collapseGaps,
  showStarMarkers,
  zoomScale,
  groupingMode = 'default',
  allInPage = false,
  containerWidth = 1000
}) {
  const mapped = useMemo(() => mapSegmentsToRows(segments, singleLane, groupingMode), [segments, singleLane, groupingMode]);

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
  
  const timelineWidth = useMemo(() => {
    if (allInPage) {
      return Math.max(minTimelinePx, containerWidth - timelinePadLeft - timelinePadRight - 10);
    }
    return Math.min(GANTT_MAX_TIMELINE_WIDTH_PX, Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale)));
  }, [allInPage, containerWidth, minTimelinePx, baseTimelineWidth, zoomScale, timelinePadLeft, timelinePadRight]);

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
  }), [lanes, laneToSegments, singleLane, stackOverlapsInSingleLane, compactTs, displayMinTs, displayMaxTs, baseCompactedTs, pxPerMs, timelinePadLeft]);

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
  }, [lanes, laneToPositionedBars, timelineWidth, timelinePadLeft, timelinePadRight]);

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

  const ticks = useMemo(() => buildGanttTicks({
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getTickX: getAxisX,
  }), [timelineWidth, displaySpanHours, displayMinTs, displayMaxTs, collapseGaps, visibleSegments, getAxisX]);

  return {
    mapped,
    getLabelTs,
    visibleSegments,
    displayMinTs,
    displayMaxTs,
    displaySpanMs,
    legendItems,
    lanes,
    stackOverlapsInSingleLane,
    timelineWidth,
    getX,
    laneToPositionedBars,
    laneStackDepths,
    timelineSvgWidth,
    getAxisX,
    ticks
  };
}
