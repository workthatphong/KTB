// @ts-nocheck
import {
  applyWeekendExclusionToSegments,
  buildDocumentTree,
  buildUserOptions,
  getDateRangeBounds,
  normalizeSelectedSegmentTypes,
  parseSegments,
  SEGMENT_GROUP_OPTIONS,
  toSegmentGroup,
} from '../utils/segmentData';
import { extractFileNameFromSheetKey, isIdleContextSegment, toTimelineLane, buildKpisFromSegments, safeNumber } from '@/lib/utils.ts';
import { calculateFlowRows, calculateUserStatsRows } from '../utils/dataParsers';

export function computeDerivedData(params: any) {
  const {
    sources,
    performance,
    datePreset,
    dateStart,
    dateEnd,
    selectedFiles,
    selectedSheets,
    selectedSegmentTypes,
    excludeWeekends,
  } = params;

  const segments = performance?.segments || [];
  const invalidSheetCounts = performance?.invalidSheetCounts || {};

  const normalizedSelectedSegmentTypes = normalizeSelectedSegmentTypes(selectedSegmentTypes);
  const rawParsedSegments = parseSegments(segments);

  const weekendAdjusted = excludeWeekends 
    ? applyWeekendExclusionToSegments(rawParsedSegments) 
    : { segments: rawParsedSegments, affectedCount: 0 };

  const parsedSegments = weekendAdjusted.segments;
  const documentTree = buildDocumentTree(sources, parsedSegments);
  
  const userOptions = buildUserOptions({
    parsedSegments,
    selectedSheets,
    selectedFiles,
    datePreset,
    dateStart,
    dateEnd,
    excludeWeekends,
  });

  const dateRangeBounds = getDateRangeBounds(rawParsedSegments, datePreset, dateStart, dateEnd);
  const weekendExcludedCount = excludeWeekends ? weekendAdjusted.affectedCount : 0;
  const segmentTypeOptions = SEGMENT_GROUP_OPTIONS;

  return {
    invalidSheetCounts,
    parsedSegments,
    documentTree,
    userOptions,
    dateRangeBounds,
    weekendExcludedCount,
    segmentTypeOptions,
    normalizedSelectedSegmentTypes,
  };
}

export function computeFilters(parsedSegments: any[], filters: any) {
  const {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes,
    showIdle,
    dateRangeBounds,
    excludeWeekends,
  } = filters;

  if (parsedSegments.length === 0) return { filteredBaseSegments: [], ganttVisibleSegments: [] };

  const fileSet = new Set(selectedFiles);
  const sheetSet = new Set(selectedSheets);
  const userSet = new Set(selectedUsers);

  if (fileSet.size === 0 && sheetSet.size === 0) return { filteredBaseSegments: [], ganttVisibleSegments: [] };

  const filesWithSpecificSheets = new Set();
  for (const sheetKey of selectedSheets) {
    filesWithSpecificSheets.add(extractFileNameFromSheetKey(sheetKey));
  }

  const filteredBaseSegments = parsedSegments.filter((segment) => {
    const rangeStartTs = segment.rawStartTs ?? segment.startTs;
    const rangeEndTs = segment.rawEndTs ?? segment.endTs;
    if (rangeEndTs < dateRangeBounds.minTs || rangeStartTs > dateRangeBounds.maxTs) return false;
    if (excludeWeekends && (Number(segment.durationSeconds) || 0) <= 0) return false;

    const fileSelected = fileSet.has(segment.fileName);
    const sheetSelected = sheetSet.has(segment.sheetKey);
    const hasSpecificSheets = filesWithSpecificSheets.has(segment.fileName);

    if (hasSpecificSheets) {
      if (!sheetSelected) return false;
    } else if (!fileSelected) {
      return false;
    }

    if (userSet.size > 0) {
      const lane = toTimelineLane(segment.segmentType, segment.userName);
      if (!userSet.has(lane)) return false;
    }

    return true;
  });

  const ganttVisibleSegments = filteredBaseSegments.filter((segment) => {
    const segmentType = String(segment.segmentType || '');
    if (!showIdle && isIdleContextSegment(segmentType)) return false;
    const segmentGroup = toSegmentGroup(segmentType);
    if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
    return true;
  });

  return { filteredBaseSegments, ganttVisibleSegments };
}

export function computeMetrics(params: any) {
  const {
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes,
  } = params;

  const chartBaseSegments = filteredBaseSegments.filter((segment: any) => {
    const segmentGroup = toSegmentGroup(segment.segmentType);
    if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
    return true;
  });

  const kpis = chartBaseSegments.length > 0 ? buildKpisFromSegments(chartBaseSegments) : null;
  const flowRows = calculateFlowRows(chartBaseSegments);
  const userStatsRows = calculateUserStatsRows(chartBaseSegments);
  const contributionRows = userStatsRows.map((row: any) => ({ ...row }));

  const laneDurationMap = new Map();
  chartBaseSegments.forEach((segment: any) => {
    const segmentType = String(segment.segmentType || '');
    const durationSeconds = safeNumber(segment.durationSeconds);
    if (durationSeconds <= 0) return;

    const isIdle = isIdleContextSegment(segmentType);
    if (isIdle && !showWorkloadIdle) return;

    let lane = toTimelineLane(segmentType, segment.userName);
    if (segmentType.startsWith('SYSTEM_')) lane = 'System';
    if (isIdle) lane = 'Idle';
    laneDurationMap.set(lane, (laneDurationMap.get(lane) || 0) + durationSeconds);
  });

  const workloadContributors = Array.from(laneDurationMap.entries())
    .map(([user, totalSeconds]) => ({ user, totalSeconds }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return {
    chartBaseSegments,
    kpis,
    flowRows,
    contributionRows,
    workloadContributors,
  };
}
