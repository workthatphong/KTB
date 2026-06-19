import { useState, useMemo, useRef, useEffect } from 'react';
import { GANTT_DRILL_GROUP_LABELS } from '../../../lib/constants.js';

export function useGanttTooltip({
  containerRef,
  visibleSegments,
  getLabelTs,
  onSelectSegment
}) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const tooltipFrameRef = useRef(null);

  const showTooltipSourceDetails = useMemo(() => {
    const uniqueSheets = new Set(
      visibleSegments.map((segment) => `${String(segment.fileName || '')}::${String(segment.pageName || '')}`)
    );
    return uniqueSheets.size > 1;
  }, [visibleSegments]);

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

    const tooltipWidth = 280;
    const tooltipHeight = showTooltipSourceDetails ? 220 : 160;
    const offset = 12;
    const edgeBuffer = 10;

    const clientX = event.clientX;
    const clientY = event.clientY;

    let vX = clientX + offset;
    let vY = clientY + offset;

    if (vX + tooltipWidth > window.innerWidth - edgeBuffer) {
      vX = clientX - tooltipWidth - offset;
    }

    if (vY + tooltipHeight > window.innerHeight - edgeBuffer) {
      vY = clientY - tooltipHeight - offset;
    }

    let finalX = vX - rect.left;
    let finalY = vY - rect.top;

    finalX = Math.max(edgeBuffer, Math.min(finalX, rect.width - tooltipWidth - edgeBuffer));
    finalY = Math.max(-rect.top + edgeBuffer, Math.min(finalY, rect.height - tooltipHeight - edgeBuffer));

    const nextHoveredSegment = {
      x: finalX,
      y: finalY,
      lane: displayLane,
      color,
      showSourceDetails: showTooltipSourceDetails,
      groupLabel: GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup,
      segmentType: segment.segmentType,
      fileName: segment.fileName || 'Unknown File',
      sheetName: segment.pageName || '',
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
          prev.showSourceDetails === nextHoveredSegment.showSourceDetails &&
          prev.segmentType === nextHoveredSegment.segmentType &&
          prev.fileName === nextHoveredSegment.fileName &&
          prev.sheetName === nextHoveredSegment.sheetName &&
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
    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
  }, []);

  const hideTooltip = () => setHoveredSegment(null);

  return {
    hoveredSegment,
    showTooltip,
    hideTooltip,
    pickSegment,
  };
}
