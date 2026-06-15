import { GANTT_DRILL_GROUPS } from '../../lib/constants.js';
import { mergeContinuousReprocessingSegments } from '../../lib/utils.js';

const GANTT_GAP_COMPACTION_THRESHOLD_MS = 30 * 1000;
const GANTT_VISUAL_GAP_MS = 10 * 1000;
const GANTT_TICK_STEP_CANDIDATES_MS = [
  1800000, 3600000, 7200000, 10800000, 14400000,
  21600000, 28800000, 43200000, 86400000
];

export function buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers) {
  const items = GANTT_DRILL_GROUPS.filter((item) => {
    if (item.key === 'ReviewAutoClose' || item.key === 'EditAndComplete') return false;
    if (!showIdleLane && item.key === 'Idle') return false;
    if (!showSystemLane && (item.key === 'Processing' || item.key === 'Reprocessing')) return false;
    return true;
  });

  return items;
}

export function buildGanttDisplayBounds(laneVisibleSegments, mappedSegments) {
  const boundsSegments = laneVisibleSegments.length > 0 ? laneVisibleSegments : mappedSegments;
  if (boundsSegments.length === 0) {
    const nowTs = Date.now();
    return { displayMinTs: nowTs - 60000, displayMaxTs: nowTs + 60000 };
  }
  const fMin = boundsSegments.reduce((min, item) => Math.min(min, item.startTs), boundsSegments[0].startTs);
  const fMax = boundsSegments.reduce((max, item) => Math.max(max, item.endTs), boundsSegments[0].endTs);
  const pad = Math.min(10 * 60 * 1000, Math.max(1 * 60 * 1000, (fMax - fMin) * 0.005));
  return { displayMinTs: fMin - pad, displayMaxTs: fMax + pad };
}

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

export function buildGanttLanes(visibleSegments, showSystemLane, showIdleLane) {
  const laneDurationMap = {};
  visibleSegments.forEach((item) => {
    if (!laneDurationMap[item.lane]) laneDurationMap[item.lane] = 0;
    laneDurationMap[item.lane] += item.durationSeconds;
  });

  return Object.keys(laneDurationMap).sort((a, b) => {
    const priority = (name) => name === 'System' ? 1 : (name === 'Idle' ? 2 : 3);
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return (laneDurationMap[b] - laneDurationMap[a]) || a.localeCompare(b);
  }).filter((lane) => (showSystemLane || lane !== 'System') && (showIdleLane || lane !== 'Idle'));
}

export function buildGanttLaneSegments(lanes, visibleSegments) {
  const groups = {};
  visibleSegments.forEach((segment) => {
    if (!groups[segment.lane]) groups[segment.lane] = [];
    groups[segment.lane].push(segment);
  });

  const result = {};
  lanes.forEach((lane) => {
    const segments = (groups[lane] || []).sort((a, b) => a.startTs - b.startTs);
    result[lane] = mergeContinuousReprocessingSegments(segments);
  });
  return result;
}

export function buildGanttPositionedBars(config) {
  const {
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
  } = config;

  const allSegments = [];
  lanes.forEach((lane) => {
    const bars = laneToSegments[lane] || [];
    bars.forEach((segment) => {
      allSegments.push({ lane, segment });
    });
  });

  allSegments.sort((a, b) => a.segment.startTs - b.segment.startTs);

  let globalLastRight = -1;
  let globalLastEndTs = -1;
  let currentGlobalShift = 0; // Tracks staircase offset to keep stacked bars aligned and drift-free during zoom
  
  const positionedByLane = {};
  const laneStackDepths = {};
  lanes.forEach((lane) => { positionedByLane[lane] = []; });
  lanes.forEach((lane) => { laneStackDepths[lane] = 1; });

  allSegments.forEach(({ lane, segment }) => {
    const x1 = timelinePadLeft + (compactTs(Math.max(segment.startTs, displayMinTs)) - baseCompactedTs) * pxPerMs;
    const x2 = timelinePadLeft + (compactTs(Math.min(segment.endTs, displayMaxTs)) - baseCompactedTs) * pxPerMs;

    let x = x1;
    
    // Dynamic minimum width: ensure visibility
    const durationSecs = Math.max(1, segment.durationSeconds || ((segment.endTs - segment.startTs) / 1000));
    const minWidth = 8 + (Math.log10(durationSecs) * 4);
    const width = Math.max(minWidth, x2 - x1);

    if (segment.startTs < globalLastEndTs) {
      // Overlap case: Apply the same staircase shift as the current group to keep them aligned (ซ้อนกัน)
      // and ensure they scale perfectly with the rest of the bars during zoom.
      x = x1 + currentGlobalShift;
    } else {
      // Non-overlap case: Maintain original staircase flow (ดังเดิม)
      if (x < globalLastRight + 1.5) {
        x = globalLastRight + 1.5;
      }
      currentGlobalShift = x - x1;
    }

    positionedByLane[lane].push({ s: segment, x, w: width });
    
    // Update global trackers to ensure the next non-overlapping bar is pushed correctly
    globalLastRight = Math.max(globalLastRight, x + width);
    globalLastEndTs = Math.max(globalLastEndTs, segment.endTs);
  });

  if (singleLane && stackOverlapsInSingleLane) {
    lanes.forEach((lane) => {
      const activeRightByLevel = [];
      positionedByLane[lane] = (positionedByLane[lane] || []).map((positioned) => {
        let stackLevel = 0;
        while ((activeRightByLevel[stackLevel] ?? -Infinity) > positioned.x) {
          stackLevel += 1;
        }
        activeRightByLevel[stackLevel] = positioned.x + positioned.w;
        laneStackDepths[lane] = Math.max(laneStackDepths[lane], stackLevel + 1);
        return { ...positioned, stackLevel };
      });
    });
  }

  return { positionedByLane, laneStackDepths };
}

export function buildGanttAxisAnchors(config) {
  const {
    lanes,
    laneToPositionedBars,
    displayMinTs,
    displayMaxTs,
    timelinePadLeft,
    timelineWidth,
    timelineSvgWidth,
  } = config;

  const anchorMap = new Map();
  const pushAnchor = (ts, x) => {
    if (!Number.isFinite(ts) || !Number.isFinite(x)) return;
    const existingX = anchorMap.get(ts);
    anchorMap.set(ts, existingX == null ? x : Math.max(existingX, x));
  };

  pushAnchor(displayMinTs, timelinePadLeft);
  pushAnchor(displayMaxTs, Math.max(timelinePadLeft + timelineWidth, timelineSvgWidth - 18));

  lanes.forEach((lane) => {
    const positionedBars = laneToPositionedBars[lane] || [];
    positionedBars.forEach(({ s, x, w }) => {
      pushAnchor(s.startTs, x);
      pushAnchor(s.endTs, x + w);
    });
  });

  const anchors = Array.from(anchorMap.entries())
    .map(([ts, x]) => ({ ts, x }))
    .sort((a, b) => a.ts - b.ts);

  for (let idx = 1; idx < anchors.length; idx += 1) {
    if (anchors[idx].x < anchors[idx - 1].x) {
      anchors[idx].x = anchors[idx - 1].x;
    }
  }

  return anchors;
}

export function interpolateGanttAxisX(ts, anchors, fallbackX) {
  if (!Array.isArray(anchors) || anchors.length === 0 || !Number.isFinite(ts)) {
    return fallbackX(ts);
  }

  if (anchors.length === 1) return anchors[0].x;
  if (ts <= anchors[0].ts) return anchors[0].x;
  if (ts >= anchors[anchors.length - 1].ts) return anchors[anchors.length - 1].x;

  let low = 0;
  let high = anchors.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (anchors[mid].ts === ts) return anchors[mid].x;
    if (anchors[mid].ts < ts) low = mid + 1;
    else high = mid - 1;
  }

  const right = anchors[low];
  const left = anchors[Math.max(0, low - 1)];
  const spanTs = right.ts - left.ts;
  if (spanTs <= 0) return Math.max(left.x, right.x);

  const ratio = (ts - left.ts) / spanTs;
  return left.x + (right.x - left.x) * ratio;
}

export function buildGanttTicks(config) {
  const {
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getTickX,
  } = config;

  const effPxPerHour = timelineWidth / Math.max(displaySpanHours, 1);
  const step = GANTT_TICK_STEP_CANDIDATES_MS.find((candidate) => (candidate / 3600000 * effPxPerHour) >= 120) || 86400000;
  const start = Math.floor(displayMinTs / step) * step;
  let ticks = [];

  for (let tickTs = start; tickTs <= displayMaxTs + step; tickTs += step) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) ticks.push(tickTs);
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  if (collapseGaps) {
    ticks = ticks.filter((tickTs) => {
      if (tickTs === displayMinTs || tickTs === displayMaxTs) return true;
      return visibleSegments.some((segment) => tickTs >= segment.startTs - 120000 && tickTs <= segment.endTs + 120000);
    });
  }

  const finalTicks = [];
  ticks.sort((a, b) => a - b).forEach((tickTs) => {
    if (finalTicks.length === 0) {
      finalTicks.push(tickTs);
      return;
    }

    const lastX = getTickX(finalTicks[finalTicks.length - 1]);
    const currX = getTickX(tickTs);
    if (tickTs === displayMaxTs) {
      if (currX - lastX >= 65) finalTicks.push(tickTs);
      else if (finalTicks.length > 1) finalTicks[finalTicks.length - 1] = tickTs;
    } else if (currX - lastX >= 65) {
      finalTicks.push(tickTs);
    }
  });
  return finalTicks;
}

export function getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, laneCount) {
  const bufferLanes = 3;
  const startLaneIdx = Math.max(0, Math.floor((scrollState.top - rowTopPadding) / rowSlotHeight) - bufferLanes);
  const endLaneIdx = Math.min(laneCount - 1, Math.ceil((scrollState.top + scrollState.viewH) / rowSlotHeight) + bufferLanes);
  return { startLaneIdx, endLaneIdx };
}
