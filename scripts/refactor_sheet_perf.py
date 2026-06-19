import os

base_dir = '/workspaces/KTB/frontend/src/features/dashboard/utils/sheet-performance'
os.makedirs(base_dir, exist_ok=True)
filepath = '/workspaces/KTB/frontend/src/features/dashboard/utils/sheetPerformanceCharts.js'

with open(filepath, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1: return ""
    if end_str is None: return text[start:]
    end = text.find(end_str, start)
    if end == -1: return text[start:]
    return text[start:end]

# 1. constants.js
constants_content = """export const SHEET_PERFORMANCE_CHART_IDS = [
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
"""
with open(os.path.join(base_dir, 'constants.js'), 'w') as f:
    f.write(constants_content)

# 2. dataBuilder.js
builder_part = extract_block(content, "export function buildSheetPerformanceChartsData", "export function selectIdleTimeChartData")
builder_content = """import { buildKpisFromSegments } from '../../../../lib/kpiUtils.js';
import { toDrillGroup, toCompleteMarkerType } from '../../../../lib/segmentUtils.js';
import { USER_ACTION_TYPES } from './constants.js';

""" + builder_part
with open(os.path.join(base_dir, 'dataBuilder.js'), 'w') as f:
    f.write(builder_content)

# 3. dataSelectors.js
selectors_part1 = extract_block(content, "export function selectIdleTimeChartData", "export function getTotalTimeChartAppearance")
selectors_part2 = extract_block(content, "export function sortSheetPerformanceChartData", None)
selectors_content = selectors_part1 + selectors_part2
with open(os.path.join(base_dir, 'dataSelectors.js'), 'w') as f:
    f.write(selectors_content)

# 4. appearance.js
appearance_part = extract_block(content, "export function getTotalTimeChartAppearance", "export function isUserTimeCountMode")
appearance_content = """import { GANTT_DRILL_GROUP_COLORS } from '../../../../lib/constants.js';

""" + appearance_part
with open(os.path.join(base_dir, 'appearance.js'), 'w') as f:
    f.write(appearance_content)

# 5. update sheetPerformanceCharts.js proxy
proxy_content = """export * from './sheet-performance/constants.js';
export * from './sheet-performance/dataBuilder.js';
export * from './sheet-performance/dataSelectors.js';
export * from './sheet-performance/appearance.js';
"""
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("sheetPerformanceCharts refactoring complete.")
