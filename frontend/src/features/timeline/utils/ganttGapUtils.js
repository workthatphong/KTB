import { GANTT_GAP_COMPACTION_THRESHOLD_MS, GANTT_VISUAL_GAP_MS } from './ganttConstants.js';

export function buildGanttGapInfo(collapseGaps, visibleSegments, displayMinTs, displayMaxTs) {
  if (!collapseGaps || visibleSegments.length === 0) {
    return { gaps: [], compactedMinTs: displayMinTs, compactedMaxTs: displayMaxTs, totalExcess: 0 };
  }

  const activeIntervals = [];
  visibleSegments.forEach((seg) => {
    activeIntervals.push({ start: seg.startTs, end: seg.endTs });
    if (Array.isArray(seg.reopenMarkerList)) {
      seg.reopenMarkerList.forEach((marker) => activeIntervals.push({ start: marker.ts, end: marker.ts }));
    }
  });

  activeIntervals.sort((a, b) => a.start - b.start);

  const merged = [];
  activeIntervals.forEach((interval) => {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...interval });
      return;
    }
    if (interval.start <= prev.end + 5000) {
      prev.end = Math.max(prev.end, interval.end);
      return;
    }
    merged.push({ ...interval });
  });

  const gaps = [];
  let lastTs = displayMinTs;
  let cumulativeExcess = 0;

  merged.forEach((interval) => {
    if (interval.start > lastTs + GANTT_GAP_COMPACTION_THRESHOLD_MS) {
      const span = interval.start - lastTs;
      const excess = span - GANTT_VISUAL_GAP_MS;
      gaps.push({ start: lastTs, end: interval.start, originalSpan: span, excessSpan: excess, cumulativeExcess });
      cumulativeExcess += excess;
    }
    lastTs = interval.end;
  });

  const lastSpan = displayMaxTs - lastTs;
  if (lastSpan > GANTT_GAP_COMPACTION_THRESHOLD_MS) {
    const excess = lastSpan - GANTT_VISUAL_GAP_MS;
    gaps.push({ start: lastTs, end: displayMaxTs, originalSpan: lastSpan, excessSpan: excess, cumulativeExcess });
    cumulativeExcess += excess;
  }

  return {
    gaps,
    compactedMinTs: displayMinTs,
    compactedMaxTs: displayMaxTs - cumulativeExcess,
    totalExcess: cumulativeExcess,
  };
}

export function compactGanttTimestamp(realTs, gaps) {
  if (!Array.isArray(gaps) || gaps.length === 0) return realTs;

  let low = 0;
  let high = gaps.length - 1;
  let foundGap = null;
  let prevGapsExcess = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const gap = gaps[mid];
    if (realTs < gap.start) {
      high = mid - 1;
    } else if (realTs > gap.end) {
      prevGapsExcess = gap.cumulativeExcess + gap.excessSpan;
      low = mid + 1;
    } else {
      foundGap = gap;
      break;
    }
  }

  if (!foundGap) return realTs - prevGapsExcess;

  const fraction = (realTs - foundGap.start) / foundGap.originalSpan;
  return realTs - (foundGap.cumulativeExcess + fraction * foundGap.excessSpan);
}

