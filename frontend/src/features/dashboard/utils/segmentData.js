import { buildSheetKey, toDrillGroup, toTimelineLane } from '../../../lib/utils.js';

export const SEGMENT_GROUP_OPTIONS = ['Uploading', 'Processing', 'Reprocess', 'Review', 'EditData', 'EditMeta', 'Idle'];

const DAY_WINDOW_MAP = { '7d': 7, '30d': 30, '90d': 90 };
const DAY_MS = 24 * 60 * 60 * 1000;

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

export function parseSegments(segments) {
  const parsed = [];

  segments.forEach((segment, idx) => {
    const [docFileFromId = '', docPageFromId = ''] = String(segment.documentId || '').split('::');
    const fileName = String(segment.fileName || docFileFromId || 'Unknown File');
    const pageName = String(segment.pageName || docPageFromId || '');
    const sheetKey = buildSheetKey(fileName, pageName);

    const startTs = Date.parse(segment.start || '');
    const endTsRaw = Date.parse(segment.end || '');
    if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

    const documentLabel = pageName ? `${fileName} / ${pageName}` : fileName;
    parsed.push({
      ...segment,
      id: segment.id || `${segment.segmentType || 'UNKNOWN'}-${idx}`,
      segmentType: String(segment.segmentType || 'UNKNOWN'),
      userName: String(segment.userName || 'Unknown User'),
      fileName,
      pageName,
      sheetKey,
      rawStartTs: startTs,
      rawEndTs: Math.max(endTsRaw, startTs + 1000),
      rawStart: segment.start,
      rawEnd: segment.end,
      startTs,
      endTs: Math.max(endTsRaw, startTs + 1000),
      documentLabel,
    });
  });

  return parsed;
}

export function isWeekendSegment(segment) {
  const startDay = new Date(segment.rawStartTs ?? segment.startTs).getDay();
  const endDay = new Date(segment.rawEndTs ?? segment.endTs).getDay();
  return startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6;
}

function getLocalDayStartTs(ts) {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getNextLocalDayStartTs(ts) {
  return getLocalDayStartTs(ts) + DAY_MS;
}

export function calculateWeekendOverlapMs(startTs, endTs) {
  const safeStart = Number(startTs);
  const safeEnd = Math.max(Number(endTs), safeStart);
  if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeEnd <= safeStart) return 0;

  let totalWeekendMs = 0;
  let cursor = safeStart;

  while (cursor < safeEnd) {
    const nextDayStart = getNextLocalDayStartTs(cursor);
    const chunkEnd = Math.min(nextDayStart, safeEnd);
    const day = new Date(cursor).getDay();
    if (day === 0 || day === 6) totalWeekendMs += (chunkEnd - cursor);
    cursor = chunkEnd;
  }

  return totalWeekendMs;
}

export function calculateBusinessDurationMs(startTs, endTs) {
  const safeStart = Number(startTs);
  const safeEnd = Math.max(Number(endTs), safeStart);
  if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeEnd <= safeStart) return 0;
  return Math.max(0, safeEnd - safeStart - calculateWeekendOverlapMs(safeStart, safeEnd));
}

export function projectTimestampExcludingWeekends(baseTs, targetTs) {
  const safeBase = Number(baseTs);
  const safeTarget = Number(targetTs);
  if (!Number.isFinite(safeBase) || !Number.isFinite(safeTarget)) return safeTarget;
  if (safeTarget === safeBase) return safeBase;
  if (safeTarget > safeBase) return safeBase + calculateBusinessDurationMs(safeBase, safeTarget);
  return safeBase - calculateBusinessDurationMs(safeTarget, safeBase);
}

export function shiftBusinessTime(baseTs, deltaMs) {
  const safeBase = Number(baseTs);
  const safeDelta = Number(deltaMs);
  if (!Number.isFinite(safeBase) || !Number.isFinite(safeDelta) || safeDelta === 0) return safeBase;

  let cursor = safeBase;

  if (safeDelta > 0) {
    let remaining = safeDelta;
    while (remaining > 0) {
      const day = new Date(cursor).getDay();
      if (day === 0 || day === 6) {
        cursor = getNextLocalDayStartTs(cursor);
        continue;
      }

      const nextDayStart = getNextLocalDayStartTs(cursor);
      const available = nextDayStart - cursor;
      const step = Math.min(remaining, available);
      cursor += step;
      remaining -= step;
    }
    return cursor;
  }

  let remaining = Math.abs(safeDelta);
  while (remaining > 0) {
    const previousMoment = cursor - 1;
    const day = new Date(previousMoment).getDay();
    if (day === 0 || day === 6) {
      cursor = getLocalDayStartTs(previousMoment);
      continue;
    }

    const dayStart = getLocalDayStartTs(cursor);
    const available = cursor - dayStart;
    if (available <= 0) {
      cursor -= 1;
      continue;
    }

    const step = Math.min(remaining, available);
    cursor -= step;
    remaining -= step;
  }

  return cursor;
}

export function resolveBusinessAxisTimestamp(baseTs, projectedTs) {
  const safeBase = Number(baseTs);
  const safeProjected = Number(projectedTs);
  if (!Number.isFinite(safeBase) || !Number.isFinite(safeProjected)) return safeProjected;
  return shiftBusinessTime(safeBase, safeProjected - safeBase);
}

export function applyWeekendExclusionToSegments(parsedSegments) {
  if (!Array.isArray(parsedSegments) || parsedSegments.length === 0) {
    return { segments: [], affectedCount: 0 };
  }

  const baseTs = parsedSegments.reduce(
    (minTs, segment) => Math.min(minTs, segment.rawStartTs ?? segment.startTs),
    parsedSegments[0].rawStartTs ?? parsedSegments[0].startTs
  );

  let affectedCount = 0;
  const segments = parsedSegments
    .map((segment) => {
      const rawStartTs = segment.rawStartTs ?? segment.startTs;
      const rawEndTs = segment.rawEndTs ?? segment.endTs;
      const adjustedStartTs = projectTimestampExcludingWeekends(baseTs, rawStartTs);
      const adjustedEndTs = projectTimestampExcludingWeekends(baseTs, rawEndTs);
      const adjustedDurationMs = Math.max(0, adjustedEndTs - adjustedStartTs);
      const weekendOverlapMs = Math.max(0, (rawEndTs - rawStartTs) - adjustedDurationMs);

      if (weekendOverlapMs > 0) affectedCount += 1;

      return {
        ...segment,
        rawStartTs,
        rawEndTs,
        rawStart: segment.rawStart ?? segment.start,
        rawEnd: segment.rawEnd ?? segment.end,
        weekendOverlapMs,
        startTs: adjustedStartTs,
        endTs: adjustedEndTs,
        start: new Date(adjustedStartTs).toISOString(),
        end: new Date(adjustedEndTs).toISOString(),
        durationSeconds: Math.max(0, Math.round(adjustedDurationMs / 1000)),
      };
    })
    .filter((segment) => segment.durationSeconds > 0);

  return { segments, affectedCount };
}

export function buildDocumentTree(sources, parsedSegments) {
  const fileMap = new Map();

  (sources || []).forEach((source) => {
    const fileName = String(source.fileName || source.name || 'Unknown File');
    if (!fileMap.has(fileName)) fileMap.set(fileName, new Set());
    (source.pages || []).forEach((page) => {
      if (page) fileMap.get(fileName).add(String(page));
    });
  });

  parsedSegments.forEach((segment) => {
    if (!fileMap.has(segment.fileName)) fileMap.set(segment.fileName, new Set());
    if (segment.pageName) fileMap.get(segment.fileName).add(segment.pageName);
  });

  return Array.from(fileMap.entries())
    .map(([fileName, sheetSet]) => ({
      fileName,
      sheets: Array.from(sheetSet).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function getDateRangeBounds(parsedSegments, datePreset, dateStart, dateEnd) {
  if (parsedSegments.length === 0) {
    return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
  }

  if (datePreset === 'custom') {
    const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
    const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
    return { minTs: Math.min(startTs, endTs), maxTs: Math.max(startTs, endTs) };
  }

  if (datePreset === 'all') {
    return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
  }

  const latestEndTs = parsedSegments.reduce(
    (maxTs, segment) => Math.max(maxTs, segment.rawEndTs ?? segment.endTs),
    parsedSegments[0].rawEndTs ?? parsedSegments[0].endTs
  );
  const windowDays = DAY_WINDOW_MAP[datePreset] || 30;

  return {
    minTs: latestEndTs - (windowDays * 24 * 60 * 60 * 1000),
    maxTs: latestEndTs,
  };
}

export function buildUserOptions({
  parsedSegments,
  selectedSheets,
  selectedFiles,
  datePreset,
  dateStart,
  dateEnd,
  excludeWeekends,
}) {
  let minTs = Number.NEGATIVE_INFINITY;
  let maxTs = Number.POSITIVE_INFINITY;

  if (parsedSegments.length > 0) {
    if (datePreset === 'custom') {
      const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
      const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
      minTs = Math.min(startTs, endTs);
      maxTs = Math.max(startTs, endTs);
    } else if (datePreset !== 'all') {
      const latestEndTs = parsedSegments.reduce(
        (maxValue, segment) => Math.max(maxValue, segment.rawEndTs ?? segment.endTs),
        parsedSegments[0].rawEndTs ?? parsedSegments[0].endTs
      );
      const windowDays = DAY_WINDOW_MAP[datePreset] || 30;
      minTs = latestEndTs - (windowDays * 24 * 60 * 60 * 1000);
      maxTs = latestEndTs;
    }
  }

  const selectedSheetKeys = new Set(selectedSheets);
  const selectedFileNames = new Set(selectedFiles);
  const useSheetFilter = selectedSheetKeys.size > 0;
  const names = new Set();

  for (const segment of parsedSegments) {
    const rangeStartTs = segment.rawStartTs ?? segment.startTs;
    const rangeEndTs = segment.rawEndTs ?? segment.endTs;
    if (rangeEndTs < minTs || rangeStartTs > maxTs) continue;
    if (excludeWeekends && (Number(segment.durationSeconds) || 0) <= 0) continue;

    if (useSheetFilter) {
      if (!selectedSheetKeys.has(segment.sheetKey)) continue;
    } else if (selectedFileNames.size > 0 && !selectedFileNames.has(segment.fileName)) {
      continue;
    }

    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (lane !== 'Idle' && lane !== 'Unknown User') names.add(lane);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
