// @ts-nocheck
/**
 * Calculates compaction and gaps for time gaps.
 */
export const calculateTimeCompaction = (segments, displayMinTs, displayMaxTs, showIdleLane, showSystemLane) => {
  const COMPACTION_THRESHOLD_MS = 30 * 1000;
  const VISUAL_GAP_MS = 10 * 1000;

  const activeIntervals = [];
  segments.forEach((seg) => {
    if (seg.origLane === 'Idle' && !showIdleLane) return;
    if (seg.origLane === 'System' && !showSystemLane) return;
    activeIntervals.push({ start: seg.startTs, end: seg.endTs });
  });
  segments.forEach((seg) => {
    if (Array.isArray(seg.reopenMarkerList)) {
      seg.reopenMarkerList.forEach((m) => {
        activeIntervals.push({ start: m.ts, end: m.ts });
      });
    }
  });

  activeIntervals.sort((a, b) => a.start - b.start);

  const mergedIntervals = [];
  activeIntervals.forEach((interval) => {
    const prev = mergedIntervals[mergedIntervals.length - 1];
    if (!prev) {
      mergedIntervals.push({ ...interval });
      return;
    }
    if (interval.start <= prev.end + 5 * 1000) {
      prev.end = Math.max(prev.end, interval.end);
    } else {
      mergedIntervals.push({ ...interval });
    }
  });

  const gaps = [];
  let lastRealTs = displayMinTs;
  mergedIntervals.forEach((interval) => {
    if (interval.start > lastRealTs + COMPACTION_THRESHOLD_MS) {
      gaps.push({
        start: lastRealTs,
        end: interval.start,
        originalSpan: interval.start - lastRealTs,
        excessSpan: (interval.start - lastRealTs) - VISUAL_GAP_MS,
      });
    }
    lastRealTs = interval.end;
  });
  if (displayMaxTs > lastRealTs + COMPACTION_THRESHOLD_MS) {
    gaps.push({
      start: lastRealTs,
      end: displayMaxTs,
      originalSpan: displayMaxTs - lastRealTs,
      excessSpan: (displayMaxTs - lastRealTs) - VISUAL_GAP_MS,
    });
  }

  const getCompactedTs = (realTs) => {
    let excessSum = 0;
    for (const gap of gaps) {
      if (realTs > gap.end) {
        excessSum += gap.excessSpan;
      } else if (realTs > gap.start) {
        const fraction = (realTs - gap.start) / gap.originalSpan;
        excessSum += fraction * gap.excessSpan;
      }
    }
    return realTs - excessSum;
  };

  return { getCompactedTs, gaps };
};
