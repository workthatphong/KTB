// @ts-nocheck
import { toDrillGroup } from '@/features/dashboard/utils/segmentUtils';

function isTransitionIdleSegment(segmentType) {
  const type = String(segmentType || '');
  return toDrillGroup(type) === 'Idle' || type === 'IDLE_WAITING_FOR_SCHEDULED_REPROCESS';
}

function shouldExcludeTransitionActivity(activityLabel, documentLabel) {
  const haystack = `${String(activityLabel || '')} ${String(documentLabel || '')}`.toLowerCase();
  return haystack.includes('markup')
    || haystack.includes('markdown')
    || haystack.includes('mark down')
    || haystack.includes('timestamp')
    || haystack.includes('time stamp')
    || haystack.includes('time stam');
}

export function buildTransitionBreakdownGroups(segments, labels = {}) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const groups = new Map([
    ['after-processing', { key: 'after-processing', label: labels.afterProcessing || 'First Spread', totalSeconds: 0, count: 0, activities: [] }],
    ['after-reprocessing', { key: 'after-reprocessing', label: labels.afterReprocessing || 'Second Spread', totalSeconds: 0, count: 0, activities: [] }],
    ['between-review-edit', { key: 'between-review-edit', label: labels.betweenReviewEdit || 'Review & Edit', totalSeconds: 0, count: 0, activities: [] }],
  ]);
  const segmentsBySheet = new Map();

  sourceSegments.forEach((segment) => {
    if (!segmentsBySheet.has(segment.sheetKey)) segmentsBySheet.set(segment.sheetKey, []);
    segmentsBySheet.get(segment.sheetKey).push(segment);
  });

  segmentsBySheet.forEach((items) => {
    const sorted = [...items].sort((a, b) => a.startTs - b.startTs);
    let hasFutureReviewOrEdit = false;
    const sheetTotals = new Map([
      ['after-processing', 0],
      ['after-reprocessing', 0],
      ['between-review-edit', 0],
    ]);

    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const curr = sorted[i];
      const currDrill = toDrillGroup(curr.segmentType);

      if (currDrill === 'Review' || currDrill === 'EditData' || currDrill === 'EditMeta') {
        hasFutureReviewOrEdit = true;
      }

      if (!isTransitionIdleSegment(curr.segmentType)) continue;

      const prev = i > 0 ? sorted[i - 1] : null;
      const prevDrill = prev ? toDrillGroup(prev.segmentType) : '';
      let groupKey = 'between-review-edit';

      if (prevDrill === 'Processing') {
        groupKey = 'after-processing';
      } else if (prevDrill === 'Reprocessing') {
        groupKey = 'after-reprocessing';
      } else if (
        hasFutureReviewOrEdit &&
        (
          prevDrill === 'Review'
          || prevDrill === 'EditData'
          || prevDrill === 'EditMeta'
          || prevDrill === 'Uploading'
        )
      ) {
        groupKey = 'between-review-edit';
      }

      const group = groups.get(groupKey);
      const durationSeconds = Number(curr.durationSeconds) || 0;
      if (durationSeconds <= 0) continue;
      if (shouldExcludeTransitionActivity(curr.segmentType, curr.documentLabel)) continue;
      sheetTotals.set(groupKey, sheetTotals.get(groupKey) + durationSeconds);
      group.activities.push({
        id: curr.id || `${groupKey}-${curr.startTs || i}`,
        activity: curr.segmentType,
        start: curr.start,
        end: curr.end,
        startTs: curr.startTs,
        durationSeconds,
        documentLabel: curr.documentLabel,
      });
    }

    groups.forEach((group, key) => {
      group.totalSeconds += sheetTotals.get(key) || 0;
      group.count += 1;
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    averageSeconds: group.count > 0 ? group.totalSeconds / group.count : 0,
  }));
}

export function buildAverageTransitionTimeData(segments, labels = {}) {
  const colors = {
    'after-processing': '#3b82f6',
    'after-reprocessing': '#6366f1',
    'between-review-edit': '#f59e0b',
  };

  return buildTransitionBreakdownGroups(segments, labels).map((group) => ({
    label: group.label,
    seconds: group.averageSeconds,
    totalSeconds: group.totalSeconds,
    color: colors[group.key] || '#94a3b8',
  }));
}
