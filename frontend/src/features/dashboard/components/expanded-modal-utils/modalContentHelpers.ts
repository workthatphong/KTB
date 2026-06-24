// @ts-nocheck
export function getModalTitle(visualizationId, kpiId) {
  const isKpiBreakdown = visualizationId.startsWith('kpi-breakdown-');
  if (isKpiBreakdown) {
    return `KPI Breakdown: ${
      kpiId === '7' ? 'Total Time' :
      kpiId === '1' ? 'User Time' :
      kpiId === '6' ? 'System Time' :
      kpiId === '8' ? 'Idle Time' :
      kpiId === '2' ? 'Contributing Users' : 'Performance Metric'
    }`;
  }
  switch (visualizationId) {
    case 'gantt-detail': return 'Timeline Source Details';
    case 'donut-detail': return 'Visualization Source Details';
    case 'contribution-detail': return 'User Breakdown Details';
    case 'process-breakdown-detail': return 'Time Breakdown Details';
    case 'matrix-detail': return 'Average Transition Time Details';
    case 'sheet-total-time': return 'Total Time By Sheet';
    case 'sheet-user-time': return 'User Time By Sheet';
    case 'sheet-system-time': return 'System Time By Sheet';
    case 'sheet-idle-time': return 'Idle Time By Sheet';
    case 'sheet-edit-data-relationship': return 'Editing Risk By Sheet';
    default: return 'Full View Analysis';
  }
}

export function getModalSubtitle(visualizationId, kpiId) {
  const isKpiBreakdown = visualizationId.startsWith('kpi-breakdown-');
  if (isKpiBreakdown) {
    return `Breakdown of ${
      kpiId === '7' ? 'Lead Time' :
      kpiId === '1' ? 'Active User Sessions' :
      kpiId === '6' ? 'System Processing' :
      kpiId === '8' ? 'Idle Waiting' :
      kpiId === '2' ? 'Unique Contributors' : 'Selected Metric'
    } By Sheet`;
  }
  switch (visualizationId) {
    case 'gantt-detail': return 'Bars Counted From Interval Segments Only';
    case 'donut-detail': return 'User Activity Timeline';
    case 'contribution-detail': return 'Review And Edit Summary';
    case 'process-breakdown-detail': return 'Grouped By Y-Axis Labels';
    case 'matrix-detail': return 'Average Transition Source Rows';
    case 'sheet-total-time': return 'Expanded breakdown for all visible sheets';
    case 'sheet-user-time': return 'Expanded breakdown for all visible sheets';
    case 'sheet-system-time': return 'Expanded breakdown for all visible sheets';
    case 'sheet-idle-time': return 'Expanded breakdown for all visible sheets';
    case 'sheet-edit-data-relationship': return 'X = Edit Data Time, Y = Edit Data Items, Bubble Size = Review Count';
    default: return 'Advanced Visualization';
  }
}
