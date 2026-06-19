import os

filepath = 'frontend/src/features/dashboard/components/ExpandedVisualizationModal.jsx'
with open(filepath, 'r') as f:
    content = f.read()

# Create utils file
os.makedirs('frontend/src/features/dashboard/utils', exist_ok=True)
utils_content = """import { toDrillGroup, toGanttSegmentTypeLabel } from '../../../lib/segmentUtils.js';

export const POINT_IN_TIME_SEGMENT_TYPES = new Set([
  'AUTO_TIMEOUT_MARKER',
  'COMPLETE_BY_REVIEW_MARKER',
  'COMPLETE_BY_EDIT_MARKER',
  'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER',
  'REOPEN_MARKER',
  'REOPEN_TO_REVIEW_HANDOFF_MARKER',
]);

export function isTimelineDurationSegment(segment) {
  const segmentType = String(segment?.segmentType || '');
  if (POINT_IN_TIME_SEGMENT_TYPES.has(segmentType)) return false;

  const rawStartTs = Date.parse(String(segment?.start || ''));
  const rawEndTs = Date.parse(String(segment?.end || ''));
  if (Number.isFinite(rawStartTs) && Number.isFinite(rawEndTs)) return rawEndTs > rawStartTs;

  const startTs = Number(segment?.startTs);
  const endTs = Number(segment?.endTs);
  return Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs;
}

export function toTimelineDetailCountKey(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Uploading') return 'Uploading';
  if (drillGroup === 'Processing') return 'Processing';
  if (drillGroup === 'Reprocessing') return 'Reprocessing';
  if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return 'Review';
  if (drillGroup === 'EditData') return 'EditData';
  if (drillGroup === 'EditMeta') return 'EditMeta';
  if (drillGroup === 'Idle') return 'Idle';
  return '';
}

export function toTimelineBarLabel(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Processing') return 'First Spread';
  if (drillGroup === 'Reprocessing') return 'Second Spread';
  return toGanttSegmentTypeLabel(segmentType);
}

export function shouldExcludeDetailActivity(activityLabel, documentLabel) {
  const haystack = `${String(activityLabel || '')} ${String(documentLabel || '')}`.toLowerCase();
  return haystack.includes('markup')
    || haystack.includes('markdown')
    || haystack.includes('mark down')
    || haystack.includes('timestamp')
    || haystack.includes('time stamp')
    || haystack.includes('time stam');
}
"""
with open('frontend/src/features/dashboard/utils/expandedViewUtils.js', 'w') as f:
    f.write(utils_content)

# Define block extractors
def extract_block(text, start_str, end_str):
    start = text.find(start_str)
    if start == -1: return ""
    end = text.find(end_str, start)
    if end == -1: return ""
    return text[start:end]

buildTimelineDetailData = extract_block(content, "function buildTimelineDetailData(segments, timelineSettings) {", "function buildUserGroups(segments, workloadVisibleRows) {")
TimelineDetailView = extract_block(content, "const TimelineDetailView = React.memo(({ segments, timelineSettings }) => {", "const UserShareDetailView = React.memo(({ segments, workloadVisibleRows }) => {")

buildUserGroups = extract_block(content, "function buildUserGroups(segments, workloadVisibleRows) {", "function buildUserBreakdownGroups(segments, contributionRows) {")
UserShareDetailView = extract_block(content, "const UserShareDetailView = React.memo(({ segments, workloadVisibleRows }) => {", "const UserBreakdownDetailView = React.memo(({ rows, segments }) => {")

buildUserBreakdownGroups = extract_block(content, "function buildUserBreakdownGroups(segments, contributionRows) {", "function buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit, mergeSpread) {")
UserBreakdownDetailView = extract_block(content, "const UserBreakdownDetailView = React.memo(({ rows, segments }) => {", "const TimeBreakdownDetailView = React.memo(({")

buildTimeBreakdownGroups = extract_block(content, "function buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit, mergeSpread) {", "const TimelineDetailView = React.memo(({ segments, timelineSettings }) => {")
TimeBreakdownDetailView = extract_block(content, "const TimeBreakdownDetailView = React.memo(({", "const TransitionBreakdownDetailView = React.memo(({ segments }) => {")

TransitionBreakdownDetailView = extract_block(content, "const TransitionBreakdownDetailView = React.memo(({ segments }) => {", "const KpiBreakdownView = React.memo(({ kpiId, segments, expanded = false }) => {")

KpiBreakdownView = extract_block(content, "const KpiBreakdownView = React.memo(({ kpiId, segments, expanded = false }) => {", "export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {")


# Write individual files
os.makedirs('frontend/src/features/dashboard/components/expanded-views', exist_ok=True)

with open('frontend/src/features/dashboard/components/expanded-views/TimelineDetailView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { mapSegmentsToRows } from '../../../timeline/timelineUtils.js';
import { mergeContinuousReprocessingSegments, toTimelineLane } from '../../../../lib/segmentUtils.js';
import { isTimelineDurationSegment, toTimelineDetailCountKey, toTimelineBarLabel, shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

""" + buildTimelineDetailData + TimelineDetailView + "\nexport { TimelineDetailView };\n")

with open('frontend/src/features/dashboard/components/expanded-views/UserShareDetailView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { Clock, User, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toTimelineLane, toGanttSegmentTypeLabel } from '../../../../lib/segmentUtils.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

""" + buildUserGroups + UserShareDetailView + "\nexport { UserShareDetailView };\n")

with open('frontend/src/features/dashboard/components/expanded-views/UserBreakdownDetailView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { Clock, User, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toTimelineLane, toGanttSegmentTypeLabel, toDrillGroup } from '../../../../lib/segmentUtils.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

""" + buildUserBreakdownGroups + UserBreakdownDetailView + "\nexport { UserBreakdownDetailView };\n")

with open('frontend/src/features/dashboard/components/expanded-views/TimeBreakdownDetailView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toTimelineLane, toGanttSegmentTypeLabel, toDrillGroup } from '../../../../lib/segmentUtils.js';
import { toSegmentGroup } from '../../utils/segmentData.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

""" + buildTimeBreakdownGroups + TimeBreakdownDetailView + "\nexport { TimeBreakdownDetailView };\n")

with open('frontend/src/features/dashboard/components/expanded-views/TransitionBreakdownDetailView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toGanttSegmentTypeLabel } from '../../../../lib/segmentUtils.js';
import { buildTransitionBreakdownGroups } from '../../utils/transitionMetrics.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

""" + TransitionBreakdownDetailView + "\nexport { TransitionBreakdownDetailView };\n")

with open('frontend/src/features/dashboard/components/expanded-views/KpiBreakdownView.jsx', 'w') as f:
    f.write("""import React from 'react';
import { formatDuration } from '../../../../lib/utils.js';
import { isIdleContextSegment, isProcessingEquivalentIdleSegment } from '../../../../lib/segmentUtils.js';
import { SheetBreakdownChart } from '../../../charts/SheetBreakdownChart.jsx';

""" + KpiBreakdownView + "\nexport { KpiBreakdownView };\n")


# Modify original file
# Find where POINT_IN_TIME_SEGMENT_TYPES begins
point_start = content.find("const POINT_IN_TIME_SEGMENT_TYPES = new Set([")
# Find where export const ExpandedVisualizationModal begins
export_start = content.find("export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {")

new_content = content[:point_start] + """import { TimelineDetailView } from './expanded-views/TimelineDetailView.jsx';
import { UserShareDetailView } from './expanded-views/UserShareDetailView.jsx';
import { UserBreakdownDetailView } from './expanded-views/UserBreakdownDetailView.jsx';
import { TimeBreakdownDetailView } from './expanded-views/TimeBreakdownDetailView.jsx';
import { TransitionBreakdownDetailView } from './expanded-views/TransitionBreakdownDetailView.jsx';
import { KpiBreakdownView } from './expanded-views/KpiBreakdownView.jsx';

""" + content[export_start:]

with open(filepath, 'w') as f:
    f.write(new_content)

print("Refactor complete")
