export const SHEET_PERFORMANCE_CHART_IDS = [
  'totalTime',
  'userTime',
  'systemTime',
  'idleTime',
];

export const USER_TIME_COUNT_MODES = new Set([
  'reviewCount',
  'editDataCount',
  'editMetaCount',
]);

export function createDefaultSheetPerformanceChartSettings() {
  return {
    totalTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
    userTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
    systemTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
    idleTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
  };
}

export const USER_ACTION_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_EDITING_METADATA_CORRECTION',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_COMPLETION_APPROVAL',
]);

export function isUserTimeCountMode(mode = 'all') {
  return USER_TIME_COUNT_MODES.has(mode);
}
