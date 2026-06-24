// @ts-nocheck
import { REOPEN_MARKER_TYPES } from '../../../lib/constants';
import {
  toTimelineLane,
  toDrillGroup,
  safeNumber,
  mergeAdjacentIdleSegments
} from '../../../lib/utils';

function applySecondSpreadHandoffTiming(rows) {
  const rowsByContext = new Map();
  rows.forEach((row) => {
    if (!rowsByContext.has(row.contextKey)) rowsByContext.set(row.contextKey, []);
    rowsByContext.get(row.contextKey).push(row);
  });

  rowsByContext.forEach((contextRows) => {
    contextRows.sort((a, b) => a.startTs - b.startTs);

    contextRows.forEach((row) => {
      const rowType = String(row.segmentType || '');
      if (!rowType.startsWith('SYSTEM_SCHEDULED_REPROCESSING')) return;

      const handoffUserRow = contextRows
        .filter((candidate) => {
          const candidateType = String(candidate.segmentType || '');
          return candidateType.startsWith('USER_')
            && candidate.startTs < row.startTs
            && Math.abs(candidate.endTs - row.startTs) <= 1000;
        })
        .sort((a, b) => (b.endTs - a.endTs) || (a.startTs - b.startTs))[0];

      const handoffSystemRow = contextRows
        .filter((candidate) => (
          candidate.segmentType === 'SYSTEM_INTERNAL_TRANSITION'
          && candidate.startTs < row.startTs
          && Math.abs(candidate.endTs - row.startTs) <= 1000
        ))
        .sort((a, b) => (b.endTs - a.endTs) || (a.startTs - b.startTs))[0];

      const handoffStartTs = Math.min(
        row.startTs,
        handoffUserRow ? handoffUserRow.startTs : row.startTs,
        handoffSystemRow ? handoffSystemRow.startTs : row.startTs
      );
      if (handoffStartTs >= row.startTs) return;

      row.startTs = handoffStartTs;
      row.start = new Date(handoffStartTs).toISOString();
      row.durationSeconds = Math.max(0, Math.round((row.endTs - handoffStartTs) / 1000));
    });
  });
}

/**
 * Maps raw segments into parsed rows for the Gantt chart.
 */
export const mapSegmentsToRows = (segments, singleLane, groupingMode = 'default') => {
  const parsedRows = [];
  const reopenMarkers = [];

  let segmentsToProcess = segments || [];

  if (groupingMode === 'file' || groupingMode === 'sheet') {
    const groups = new Map();
    segmentsToProcess.forEach(segment => {
      const segmentType = String(segment.segmentType || 'UNKNOWN');
      if (segmentType === 'AUTO_TIMEOUT_MARKER' || REOPEN_MARKER_TYPES.has(segmentType)) return;

      let key;
      let label;
      if (groupingMode === 'sheet') {
        const pName = segment.pageName || segment.sheetKey || 'Unknown Sheet';
        key = `${segment.fileName}::${pName}`;
        label = pName;
      } else {
        key = segment.fileName || 'Unknown File';
        label = key;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          ...segment,
          segmentType: 'USER_EDIT_DATA',
          _customLane: label,
          startTs: Number.MAX_SAFE_INTEGER,
          endTs: 0,
        });
      }

      const group = groups.get(key);
      const startTs = Date.parse(segment.start || '');
      const endTsRaw = Date.parse(segment.end || '');
      const endTs = Math.max(endTsRaw, startTs + 1000);

      if (Number.isFinite(startTs) && startTs < group.startTs) {
        group.startTs = startTs;
        group.start = segment.start;
      }
      if (Number.isFinite(endTs) && endTs > group.endTs) {
        group.endTs = endTs;
        group.end = segment.end;
      }
      
      const rStartTs = Number(segment.rawStartTs);
      if (Number.isFinite(rStartTs) && rStartTs < (group.rawStartTs || Number.MAX_SAFE_INTEGER)) group.rawStartTs = rStartTs;
      const rEndTs = Number(segment.rawEndTs);
      if (Number.isFinite(rEndTs) && rEndTs > (group.rawEndTs || 0)) group.rawEndTs = rEndTs;
    });

    segmentsToProcess = Array.from(groups.values()).map(g => {
      g.durationSeconds = Math.max(0, Math.round((g.endTs - g.startTs) / 1000));
      if (g.startTs !== Number.MAX_SAFE_INTEGER) g.start = new Date(g.startTs).toISOString();
      if (g.endTs !== 0) g.end = new Date(g.endTs).toISOString();
      return g;
    });
  }

  segmentsToProcess.forEach((segment, idx) => {
    const startTs = Date.parse(segment.start || '');
    const endTsRaw = Date.parse(segment.end || '');
    if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

    const segmentType = String(segment.segmentType || 'UNKNOWN');
    const contextKey = String(segment.documentId || `${segment.fileName || ''}::${segment.pageName || ''}`);

    if (segmentType === 'AUTO_TIMEOUT_MARKER') return;
    if (REOPEN_MARKER_TYPES.has(segmentType)) {
      reopenMarkers.push({ contextKey, ts: startTs, markerType: segmentType });
      return;
    }

    let lane;
    if (segment._customLane) {
      lane = segment._customLane;
    } else {
      lane = singleLane ? 'All user' : toTimelineLane(segmentType, segment.userName);
    }

    parsedRows.push({
      id: `${segmentType}-${idx}`,
      segmentType,
      lane,
      userName: segment.userName,
      origLane: segment._customLane || toTimelineLane(segmentType, segment.userName),
      startTs,
      endTs: Math.max(endTsRaw, startTs + 1000),
      durationSeconds: safeNumber(segment.durationSeconds),
      start: segment.start,
      end: segment.end,
      rawStartTs: safeNumber(segment.rawStartTs),
      rawEndTs: safeNumber(segment.rawEndTs),
      rawStart: segment.rawStart || segment.start,
      rawEnd: segment.rawEnd || segment.end,
      timeGroup: String(segment.timeGroup || ''),
      drillGroup: toDrillGroup(segmentType),
      documentId: segment.documentId || '',
      fileName: segment.fileName || '',
      pageName: segment.pageName || '',
      autoTimeout: Boolean(segment.autoTimeout),
      contextKey,
      reopenMarkerList: [],
      hasReprocessRound2CompleteMarker: segmentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
    });
  });

  applySecondSpreadHandoffTiming(parsedRows);

  const mergedRows = mergeAdjacentIdleSegments(parsedRows);

  if (reopenMarkers.length === 0 || mergedRows.length === 0) return mergedRows;

  const userBarsByContext = new Map();
  mergedRows.forEach((row) => {
    if (!String(row.segmentType || '').startsWith('USER_')) return;
    if (!userBarsByContext.has(row.contextKey)) userBarsByContext.set(row.contextKey, []);
    userBarsByContext.get(row.contextKey).push(row);
  });
  userBarsByContext.forEach((rows) => rows.sort((a, b) => a.startTs - b.startTs));

  reopenMarkers.forEach((marker) => {
    const candidateBars = userBarsByContext.get(marker.contextKey);
    if (!candidateBars || candidateBars.length === 0) return;

    let targetBar = candidateBars.find((bar) => marker.ts >= bar.startTs && marker.ts <= bar.endTs);
    if (!targetBar) targetBar = candidateBars.find((bar) => bar.startTs >= marker.ts);
    if (!targetBar) targetBar = candidateBars[candidateBars.length - 1];
    targetBar.reopenMarkerList.push({
      ts: marker.ts,
      markerType: marker.markerType || 'REOPEN_MARKER',
    });
  });

  return mergedRows;
};
