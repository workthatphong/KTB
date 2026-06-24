// @ts-nocheck
import { safeNumber } from '@/lib/utils.js';
import { 
  FLOW_INSIGHT_GROUPS, 
  WORKFLOW_FLOW_SEGMENT_TYPES,
  TRANSITION_FRIENDLY_LABELS
} from '../../../lib/constants.js';
import { isDataEditSegmentType, isMetaEditSegmentType } from '@/features/dashboard/utils/segmentUtils.js';

export function calculateFlowRows(filteredBaseSegments) {
  const groupedByDocument = new Map();
  filteredBaseSegments.forEach((segment) => {
    const segmentType = String(segment.segmentType || '');
    if (!WORKFLOW_FLOW_SEGMENT_TYPES.has(segmentType)) return;
    const documentKey = String(segment.documentId || segment.sheetKey || `${segment.fileName || ''}::${segment.pageName || ''}`);
    if (!groupedByDocument.has(documentKey)) groupedByDocument.set(documentKey, []);
    groupedByDocument.get(documentKey).push(segment);
  });

  const USER_ACTION_TYPES = new Set([
    'USER_REVIEW_COMMENT_CHECK',
    'USER_REVIEW_AUTO_TIMEOUT',
    'USER_EDITING_CORRECTION',
    'USER_EDITING_METADATA_CORRECTION',
    'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
    'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL',
    'USER_COMPLETION_APPROVAL',
  ]);
  const COMPLETE_TYPES = new Set([
    'USER_COMPLETION_APPROVAL',
    'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
    'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL',
  ]);

  const statsById = Object.fromEntries(
    FLOW_INSIGHT_GROUPS.map((group) => [group.id, { totalSeconds: 0, count: 0, minSeconds: null, maxSeconds: null }])
  );

  const addMetric = (metricId, seconds) => {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    if (!Number.isFinite(safeSeconds)) return;
    statsById[metricId].totalSeconds += safeSeconds;
    statsById[metricId].count += 1;
    statsById[metricId].minSeconds = statsById[metricId].minSeconds === null
      ? safeSeconds
      : Math.min(statsById[metricId].minSeconds, safeSeconds);
    statsById[metricId].maxSeconds = statsById[metricId].maxSeconds === null
      ? safeSeconds
      : Math.max(statsById[metricId].maxSeconds, safeSeconds);
  };

  groupedByDocument.forEach((segmentsByDoc) => {
    const sorted = [...segmentsByDoc].sort((a, b) => safeNumber(a.startTs) - safeNumber(b.startTs));
    if (sorted.length === 0) return;
    
    const reprocessIndices = [];
    for (let idx = 0; idx < sorted.length; idx += 1) {
      const current = sorted[idx];
      const currentType = String(current.segmentType || '');
      
      if (currentType === 'SYSTEM_SCHEDULED_REPROCESSING' || currentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2') {
        reprocessIndices.push(idx);
      }

      if (currentType === 'SYSTEM_INITIAL_PROCESSING') {
        const nextUserIdx = sorted.findIndex((candidate, candidateIdx) => (
          candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
        ));
        if (nextUserIdx > idx) {
          const next = sorted[nextUserIdx];
          addMetric('processing-round-1-to-user', (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000);
        }
      }

      if (USER_ACTION_TYPES.has(currentType)) {
        const nextUserStepIdx = sorted.findIndex((candidate, candidateIdx) => (
          candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
        ));
        if (nextUserStepIdx > idx) {
          const next = sorted[nextUserStepIdx];
          addMetric('user-review-edit-to-next-user-step', (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000);
        }
      }
    }

    let round2AnchorIdx = sorted.findIndex(s => String(s.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2');
    if (round2AnchorIdx < 0) round2AnchorIdx = reprocessIndices.length >= 1 ? reprocessIndices[0] : -1;
    if (round2AnchorIdx >= 0) {
      const current = sorted[round2AnchorIdx];
      const nextUserIdx = sorted.findIndex((c, i) => i > round2AnchorIdx && USER_ACTION_TYPES.has(String(c.segmentType || '')));
      if (nextUserIdx > round2AnchorIdx) {
        addMetric('processing-round-2-to-user', (safeNumber(sorted[nextUserIdx].startTs) - safeNumber(current.endTs)) / 1000);
      }
    }

    const firstUpload = sorted.find(s => String(s.segmentType || '') === 'USER_UPLOADING');
    const latestComplete = [...sorted].reverse().find(s => COMPLETE_TYPES.has(String(s.segmentType || '')));
    if (firstUpload && latestComplete) {
      addMetric('upload-to-latest-complete', (safeNumber(latestComplete.endTs) - safeNumber(firstUpload.startTs)) / 1000);
    }
  });

  return FLOW_INSIGHT_GROUPS.map((group) => {
    const stats = statsById[group.id] || { totalSeconds: 0, count: 0, minSeconds: null, maxSeconds: null };
    return {
      transitionKey: group.id,
      transitionLabel: group.label,
      count: stats.count,
      avgSeconds: stats.count > 0 ? stats.totalSeconds / stats.count : 0,
      minSeconds: stats.count > 0 ? safeNumber(stats.minSeconds) : 0,
      maxSeconds: stats.count > 0 ? safeNumber(stats.maxSeconds) : 0,
    };
  });
}

export function calculateUserStatsRows(ganttVisibleSegments) {
  const userStatsMap = new Map();
  ganttVisibleSegments.forEach((segment) => {
    const userName = String(segment.userName || '');
    if (!userName || userName.toLowerCase() === 'system') return;
    if (!String(segment.segmentType || '').startsWith('USER_')) return;
    const durationSeconds = safeNumber(segment.durationSeconds);
    if (!userStatsMap.has(userName)) {
      userStatsMap.set(userName, {
        user: userName,
        totalSeconds: 0,
        reviewSeconds: 0,
        editDataSeconds: 0,
        editMetaSeconds: 0,
        uploadSeconds: 0,
        sessionCount: 0,
        reworkCount: 0,
        editDataCount: 0,
        reviewCount: 0,
        autoClosedCount: 0,
        documents: new Set()
      });
    }
    const stats = userStatsMap.get(userName);
    stats.totalSeconds += durationSeconds;
    stats.documents.add(segment.sheetKey || segment.documentId);
    if (segment.segmentType === 'USER_UPLOADING') { stats.uploadSeconds += durationSeconds; return; }
    stats.sessionCount += 1;
    const st = String(segment.segmentType || '');
    if (isDataEditSegmentType(st)) {
      stats.editDataSeconds += durationSeconds;
      stats.editDataCount += (Number(segment.editDataItemCount) || 1);
      stats.reworkCount += 1;
    } else if (isMetaEditSegmentType(st)) {
      stats.editMetaSeconds += durationSeconds;
      stats.reworkCount += 1;
    } else { 
      stats.reviewSeconds += durationSeconds; 
      stats.reviewCount += 1;
    }
    if (segment.autoTimeout || st === 'USER_REVIEW_AUTO_TIMEOUT') { stats.autoClosedCount += 1; }
  });
  return Array.from(userStatsMap.values()).map((stats) => ({
    user: stats.user,
    totalSeconds: stats.totalSeconds,
    reviewSeconds: stats.reviewSeconds,
    editDataSeconds: stats.editDataSeconds,
    editMetaSeconds: stats.editMetaSeconds,
    uploadSeconds: stats.uploadSeconds,
    reworkRate: (stats.reviewSeconds + stats.editDataSeconds + stats.editMetaSeconds) > 0
      ? (stats.editDataSeconds + stats.editMetaSeconds) / (stats.reviewSeconds + stats.editDataSeconds + stats.editMetaSeconds)
      : 0,
    autoClosedRate: stats.sessionCount > 0 ? stats.autoClosedCount / stats.sessionCount : 0,
    avgTimePerDocSeconds: stats.totalSeconds / Math.max(1, stats.documents.size),
    sessionCount: stats.sessionCount,
    editDataCount: stats.editDataCount,
    reviewCount: stats.reviewCount,
  })).sort((a, b) => b.totalSeconds - a.totalSeconds);
}
