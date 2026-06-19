import { GANTT_DRILL_GROUPS } from '../../../lib/constants.js';

export function buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers) {
  const items = GANTT_DRILL_GROUPS.filter((item) => {
    if (item.key === 'ReviewAutoClose' || item.key === 'EditAndComplete') return false;
    if (!showIdleLane && item.key === 'Idle') return false;
    if (!showSystemLane && (item.key === 'Processing' || item.key === 'Reprocessing')) return false;
    return true;
  });

  return items;
}

