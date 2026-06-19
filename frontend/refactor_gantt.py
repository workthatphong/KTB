import os

base_dir = '/workspaces/KTB/frontend/src/features/timeline/utils'
os.makedirs(base_dir, exist_ok=True)
filepath = '/workspaces/KTB/frontend/src/features/timeline/ganttLayoutUtils.js'

with open(filepath, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1: return ""
    if end_str is None: return text[start:]
    end = text.find(end_str, start)
    if end == -1: return text[start:]
    return text[start:end]

# 1. ganttConstants.js
constants_content = """export const GANTT_GAP_COMPACTION_THRESHOLD_MS = 30 * 1000;
export const GANTT_VISUAL_GAP_MS = 10 * 1000;
export const GANTT_TICK_STEP_CANDIDATES_MS = [
  1800000, 3600000, 7200000, 10800000, 14400000,
  21600000, 28800000, 43200000, 86400000
];
"""
with open(os.path.join(base_dir, 'ganttConstants.js'), 'w') as f:
    f.write(constants_content)

# 2. ganttLegendUtils.js
legend_part = extract_block(content, "export function buildGanttLegendItems", "export function buildGanttDisplayBounds")
legend_content = """import { GANTT_DRILL_GROUPS } from '../../../lib/constants.js';

""" + legend_part
with open(os.path.join(base_dir, 'ganttLegendUtils.js'), 'w') as f:
    f.write(legend_content)

# 3. ganttGapUtils.js
gap_part1 = extract_block(content, "export function buildGanttGapInfo", "export function compactGanttTimestamp")
gap_part2 = extract_block(content, "export function compactGanttTimestamp", "export function buildGanttLanes")
gap_content = """import { GANTT_GAP_COMPACTION_THRESHOLD_MS, GANTT_VISUAL_GAP_MS } from './ganttConstants.js';

""" + gap_part1 + gap_part2
with open(os.path.join(base_dir, 'ganttGapUtils.js'), 'w') as f:
    f.write(gap_content)

# 4. ganttLaneUtils.js
lane_part1 = extract_block(content, "export function buildGanttLanes", "export function buildGanttLaneSegments")
lane_part2 = extract_block(content, "export function buildGanttLaneSegments", "export function buildGanttPositionedBars")
lane_part3 = extract_block(content, "export function getGanttVisibleLaneWindow", None)
lane_content = """import { mergeContinuousReprocessingSegments } from '../../../lib/utils.js';

""" + lane_part1 + lane_part2 + lane_part3
with open(os.path.join(base_dir, 'ganttLaneUtils.js'), 'w') as f:
    f.write(lane_content)

# 5. ganttAxisUtils.js
axis_part1 = extract_block(content, "export function buildGanttDisplayBounds", "export function buildGanttGapInfo")
axis_part2 = extract_block(content, "export function buildGanttAxisAnchors", "export function interpolateGanttAxisX")
axis_part3 = extract_block(content, "export function interpolateGanttAxisX", "export function buildGanttTicks")
axis_part4 = extract_block(content, "export function buildGanttTicks", "export function getGanttVisibleLaneWindow")
axis_content = """import { GANTT_TICK_STEP_CANDIDATES_MS } from './ganttConstants.js';

""" + axis_part1 + axis_part2 + axis_part3 + axis_part4
with open(os.path.join(base_dir, 'ganttAxisUtils.js'), 'w') as f:
    f.write(axis_content)

# 6. ganttPositionUtils.js
pos_part = extract_block(content, "export function buildGanttPositionedBars", "export function buildGanttAxisAnchors")
with open(os.path.join(base_dir, 'ganttPositionUtils.js'), 'w') as f:
    f.write(pos_part)

# 7. update ganttLayoutUtils.js
proxy_content = """export * from './utils/ganttConstants.js';
export * from './utils/ganttLegendUtils.js';
export * from './utils/ganttGapUtils.js';
export * from './utils/ganttLaneUtils.js';
export * from './utils/ganttAxisUtils.js';
export * from './utils/ganttPositionUtils.js';
"""
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("ganttLayoutUtils refactoring complete.")
