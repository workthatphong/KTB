// @ts-nocheck
import {
  SEGMENT_TYPE_SHORT_LABELS,
  GANTT_SEGMENT_DISPLAY_LABELS,
  PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES,
  REPROCESSING_SEGMENT_MERGE_GAP_MS,
  MARKER_STAR_MIN_GAP_PX
} from '../../../lib/constants';

export function toSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (SEGMENT_TYPE_SHORT_LABELS[key]) return SEGMENT_TYPE_SHORT_LABELS[key];
  return key
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toGanttSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (GANTT_SEGMENT_DISPLAY_LABELS[key]) return GANTT_SEGMENT_DISPLAY_LABELS[key];
  return toSegmentTypeLabel(key);
}

export function isProcessingEquivalentIdleSegment(segmentType) {
  const type = String(segmentType || '');
  return PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES.has(type);
}

export function isReprocessingSegmentType(segmentType) {
  const type = String(segmentType || '');
  return type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
    || isProcessingEquivalentIdleSegment(type);
}

export function toDisplaySegmentTypeCode(segmentType) {
  const type = String(segmentType || '');
  if (type === 'COMPLETE_BY_REVIEW_MARKER') return 'USER_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_BY_EDIT_MARKER') return 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER') return 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2';
  if (isReprocessingSegmentType(type)) return 'SYSTEM_SCHEDULED_REPROCESSING';
  return type;
}

export function toCompleteMarkerType(segmentOrType) {
  const segment = segmentOrType && typeof segmentOrType === 'object' ? segmentOrType : null;
  const type = String(segment ? segment.segmentType : segmentOrType || '');
  if (type === 'USER_COMPLETION_APPROVAL') return 'COMPLETE_BY_REVIEW_MARKER';
  if (
    type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL'
    || type === 'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL'
  ) return 'COMPLETE_BY_EDIT_MARKER';
  if (segment && segment.hasReprocessRound2CompleteMarker) return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  return '';
}

export function isDataEditSegmentType(segmentType) {
  const type = String(segmentType || '');
  return (
    type === 'USER_EDITING_CORRECTION'
    || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL'
  );
}

export function isMetaEditSegmentType(segmentType) {
  const type = String(segmentType || '');
  return (
    type === 'USER_EDITING_METADATA_CORRECTION'
    || type === 'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL'
  );
}

export function mergeContinuousReprocessingSegments(sortedSegments) {
  if (!Array.isArray(sortedSegments) || sortedSegments.length <= 1) return sortedSegments;

  const merged = [];
  sortedSegments.forEach((segment) => {
    const segmentCopy = {
      ...segment,
      reopenMarkerList: Array.isArray(segment.reopenMarkerList) ? [...segment.reopenMarkerList] : [],
      hasReprocessRound2CompleteMarker: Boolean(segment.hasReprocessRound2CompleteMarker)
        || String(segment.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
        || String(segment.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING',
    };

    if (merged.length === 0) {
      merged.push(segmentCopy);
      return;
    }

    const previous = merged[merged.length - 1];
    const shouldMerge = isReprocessingSegmentType(segmentCopy.segmentType)
      && isReprocessingSegmentType(previous.segmentType)
      && segmentCopy.startTs <= previous.endTs + REPROCESSING_SEGMENT_MERGE_GAP_MS;

    if (!shouldMerge) {
      merged.push(segmentCopy);
      return;
    }

    const previousEndTs = previous.endTs;
    previous.startTs = Math.min(previous.startTs, segmentCopy.startTs);
    if (segmentCopy.startTs <= previous.startTs) previous.start = segmentCopy.start;
    previous.endTs = Math.max(previous.endTs, segmentCopy.endTs);
    if (segmentCopy.endTs >= previousEndTs) previous.end = segmentCopy.end;
    previous.durationSeconds = Math.max(0, Math.round((previous.endTs - previous.startTs) / 1000));
    previous.segmentType = 'SYSTEM_SCHEDULED_REPROCESSING';
    previous.drillGroup = 'Reprocessing';
    previous.hasReprocessRound2CompleteMarker = Boolean(previous.hasReprocessRound2CompleteMarker)
      || Boolean(segmentCopy.hasReprocessRound2CompleteMarker);
    previous.reopenMarkerList = [
      ...(Array.isArray(previous.reopenMarkerList) ? previous.reopenMarkerList : []),
      ...(Array.isArray(segmentCopy.reopenMarkerList) ? segmentCopy.reopenMarkerList : []),
    ];
  });

  return merged.sort((a, b) => a.startTs - b.startTs);
}

export function mergeAdjacentIdleSegments(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) return rows;

  const rowsByContext = new Map();
  rows.forEach((row) => {
    if (!rowsByContext.has(row.contextKey)) rowsByContext.set(row.contextKey, []);
    rowsByContext.get(row.contextKey).push(row);
  });

  const allMerged = [];

  rowsByContext.forEach((contextRows) => {
    contextRows.sort((a, b) => a.startTs - b.startTs);

    const merged = [];
    contextRows.forEach((row) => {
      if (merged.length === 0) {
        merged.push({ ...row });
        return;
      }

      const prev = merged[merged.length - 1];
      const canMerge = prev.lane === 'Idle'
        && row.lane === 'Idle'
        && row.startTs <= prev.endTs + 1000;

      if (canMerge) {
        const getPriority = (type) => {
          if (type === 'IDLE_WAITING_FOR_REREVIEW') return 100;
          if (type === 'IDLE_WAITING_FOR_REVIEW') return 90;
          if (type === 'IDLE_AFTER_SYSTEM_REPROCESS') return 80;
          if (type === 'POST_COMPLETED_ELAPSED') return 10;
          return 0;
        };

        if (getPriority(row.segmentType) > getPriority(prev.segmentType)) {
          prev.segmentType = row.segmentType;
          prev.drillGroup = row.drillGroup;
        }

        prev.endTs = Math.max(prev.endTs, row.endTs);
        if (row.endTs >= prev.endTs) prev.end = row.end;
        prev.durationSeconds = Math.max(0, Math.round((prev.endTs - prev.startTs) / 1000));

        if (Array.isArray(row.reopenMarkerList)) {
          prev.reopenMarkerList = [
            ...(prev.reopenMarkerList || []),
            ...row.reopenMarkerList
          ];
        }
      } else {
        merged.push({ ...row });
      }
    });
    allMerged.push(...merged);
  });

  return allMerged;
}

export function toDrillGroup(segmentType) {
  const type = String(segmentType || '');
  if (type === 'USER_UPLOADING') return 'Uploading';
  if (type === 'COMPLETE_BY_REVIEW_MARKER') return 'Review';
  if (type === 'COMPLETE_BY_EDIT_MARKER') return 'EditData';
  if (type === 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER') return 'Reprocessing';
  if (isProcessingEquivalentIdleSegment(type)) return 'Reprocessing';
  if (type === 'SYSTEM_INITIAL_PROCESSING' || type === 'SYSTEM_INTERNAL_TRANSITION') return 'Processing';
  if (type === 'USER_REVIEW_COMMENT_CHECK') return 'Review';
  if (isIdleContextSegment(type)) return 'Idle';
  if (type === 'USER_REVIEW_AUTO_TIMEOUT' || type === 'AUTO_TIMEOUT_MARKER') return 'ReviewAutoClose';
  if (
    type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
  ) return 'Reprocessing';
  if (isDataEditSegmentType(type)) return 'EditData';
  if (isMetaEditSegmentType(type)) return 'EditMeta';
  if (type === 'USER_COMPLETION_APPROVAL') return 'Review';
  return 'Processing';
}

export function toTimelineLane(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (isProcessingEquivalentIdleSegment(type)) return 'System';
  if (type.startsWith('SYSTEM_')) return 'System';
  if (isIdleContextSegment(type)) return 'Idle';
  const userName = String(userNameRaw || '').trim();
  if (userName.toLowerCase() === 'system') return 'System';
  return userName || 'Unknown User';
}

export function isIdleContextSegment(segmentType) {
  const type = String(segmentType || '');
  return (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE')
    && !isProcessingEquivalentIdleSegment(type);
}

export function isUserContextSegment(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (type.startsWith('USER_')) return true;
  if (type === 'AUTO_TIMEOUT_MARKER') {
    const userName = String(userNameRaw || '').trim().toLowerCase();
    return userName.length > 0 && userName !== 'system';
  }
  return false;
}

export function buildAsteriskPoints(cx, cy, outerRadius = 6, innerRadius = 2.6, spikes = 5) {
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * step;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(' ');
}

export function spreadMarkerPositions(markerItems, minGapPx = MARKER_STAR_MIN_GAP_PX) {
  if (!Array.isArray(markerItems) || markerItems.length === 0) return [];
  if (markerItems.length === 1) {
    return markerItems.map((item) => ({ ...item, x: item.rawX }));
  }
  const sorted = markerItems
    .map((item, idx) => ({ ...item, orderIdx: idx }))
    .sort((a, b) => (a.rawX - b.rawX) || (a.orderIdx - b.orderIdx));

  let startIdx = 0;
  while (startIdx < sorted.length) {
    let endIdx = startIdx + 1;
    while (endIdx < sorted.length && (sorted[endIdx].rawX - sorted[endIdx - 1].rawX) < minGapPx) {
      endIdx += 1;
    }

    const cluster = sorted.slice(startIdx, endIdx);
    if (cluster.length === 1) {
      cluster[0].x = cluster[0].rawX;
    } else {
      const centerX = cluster.reduce((sum, item) => sum + item.rawX, 0) / cluster.length;
      const firstX = centerX - ((cluster.length - 1) * minGapPx) / 2;
      cluster.forEach((item, idx) => {
        item.x = firstX + (idx * minGapPx);
      });
    }

    startIdx = endIdx;
  }

  return sorted
    .sort((a, b) => a.orderIdx - b.orderIdx)
    .map(({ orderIdx, ...item }) => item);
}

export function buildSheetKey(fileName, pageName) {
  const safeFile = String(fileName || 'Unknown File');
  const safePage = String(pageName || '__NO_PAGE__');
  return `${safeFile}::${safePage}`;
}

export function extractFileNameFromSheetKey(sheetKey) {
  const normalized = String(sheetKey || '');
  const delimiterIndex = normalized.indexOf('::');
  if (delimiterIndex < 0) return normalized;
  return normalized.slice(0, delimiterIndex);
}
