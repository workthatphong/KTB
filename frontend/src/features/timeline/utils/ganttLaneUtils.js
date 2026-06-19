import { mergeContinuousReprocessingSegments } from '../../../lib/utils.js';

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

export function getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, laneCount) {
  const bufferLanes = 3;
  const startLaneIdx = Math.max(0, Math.floor((scrollState.top - rowTopPadding) / rowSlotHeight) - bufferLanes);
  const endLaneIdx = Math.min(laneCount - 1, Math.ceil((scrollState.top + scrollState.viewH) / rowSlotHeight) + bufferLanes);
  return { startLaneIdx, endLaneIdx };
}
