// @ts-nocheck
import { GANTT_TICK_STEP_CANDIDATES_MS } from './ganttConstants';

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

