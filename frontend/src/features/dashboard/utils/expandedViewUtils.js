import { toDrillGroup, toGanttSegmentTypeLabel } from '@/lib/segmentUtils.js';

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
