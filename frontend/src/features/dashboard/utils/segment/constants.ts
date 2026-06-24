// @ts-nocheck
import { toDrillGroup } from '@/lib/utils';

export const SEGMENT_GROUP_OPTIONS = ['Uploading', 'Processing', 'Reprocess', 'Review', 'EditData', 'EditMeta', 'Idle'];

export const DAY_WINDOW_MAP = { '7d': 7, '30d': 30, '90d': 90 };
export const DAY_MS = 24 * 60 * 60 * 1000;

export function toSegmentGroup(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Reprocessing') return 'Reprocess';
  if (drillGroup === 'ReviewAutoClose') return 'Review';
  if (drillGroup === 'EditAndComplete') return 'EditData';
  return drillGroup;
}

export function normalizeSelectedSegmentTypes(selectedSegmentTypes) {
  const allowedGroups = new Set(SEGMENT_GROUP_OPTIONS);
  return selectedSegmentTypes.filter((value) => allowedGroups.has(value));
}
