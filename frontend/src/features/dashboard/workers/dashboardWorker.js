import { expose } from 'comlink';
import {
  applyWeekendExclusionToSegments,
  buildDocumentTree,
  buildUserOptions,
  getDateRangeBounds,
  normalizeSelectedSegmentTypes,
  parseSegments,
  SEGMENT_GROUP_OPTIONS,
  toSegmentGroup,
} from '../utils/segmentData.js';
import { extractFileNameFromSheetKey, isIdleContextSegment, toTimelineLane, buildKpisFromSegments, safeNumber } from '@/lib/utils.js';
import { calculateFlowRows, calculateUserStatsRows } from '../utils/dataParsers.js';

function computeDerivedData(params) {
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

function computeFilters(parsedSegments, filters) {
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

function computeMetrics(params) {
  const {
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes,
  } = params;

  const chartBaseSegments = filteredBaseSegments.filter((segment) => {
    const segmentGroup = toSegmentGroup(segment.segmentType);
    if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
    return true;
  });

  const kpis = chartBaseSegments.length > 0 ? buildKpisFromSegments(chartBaseSegments) : null;
  const flowRows = calculateFlowRows(chartBaseSegments);
  const userStatsRows = calculateUserStatsRows(chartBaseSegments);
  const contributionRows = userStatsRows.map((row) => ({ ...row }));

  const laneDurationMap = new Map();
  chartBaseSegments.forEach((segment) => {
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

const api = {
  processAllDashboardData(params) {
    const { sources, performance, filterState } = params;

    const userDerived = computeDerivedData({
      sources,
      performance,
      datePreset: filterState.datePreset,
      dateStart: filterState.dateStart,
      dateEnd: filterState.dateEnd,
      excludeWeekends: filterState.excludeWeekends,
      selectedFiles: filterState.selectedFiles,
      selectedSheets: filterState.selectedSheets,
      selectedSegmentTypes: filterState.selectedSegmentTypes,
    });

    const systemDerived = computeDerivedData({
      sources,
      performance,
      datePreset: filterState.systemDatePreset,
      dateStart: filterState.systemDateStart,
      dateEnd: filterState.systemDateEnd,
      excludeWeekends: filterState.systemExcludeWeekends,
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: filterState.systemSelectedSheets,
      selectedSegmentTypes: [],
    });

    const userFilters = computeFilters(userDerived.parsedSegments, {
      selectedFiles: filterState.selectedFiles,
      selectedSheets: filterState.selectedSheets,
      selectedUsers: filterState.selectedUsers,
      selectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,
      showIdle: filterState.showIdle,
      dateRangeBounds: userDerived.dateRangeBounds,
      excludeWeekends: filterState.excludeWeekends,
    });

    const systemFilters = computeFilters(systemDerived.parsedSegments, {
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: filterState.systemSelectedSheets,
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const systemFileFilters = computeFilters(systemDerived.parsedSegments, {
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: [],
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const userMetrics = computeMetrics({
      filteredBaseSegments: userFilters.filteredBaseSegments,
      showWorkloadIdle: filterState.showWorkloadIdle,
      selectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,
    });

    const systemMetrics = computeMetrics({
      filteredBaseSegments: systemFilters.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    return {
      invalidSheetCounts: userDerived.invalidSheetCounts,
      parsedSegments: userDerived.parsedSegments,
      documentTree: userDerived.documentTree,
      systemDocumentTree: systemDerived.documentTree,
      userOptions: userDerived.userOptions,
      dateRangeBounds: userDerived.dateRangeBounds,
      weekendExcludedCount: userDerived.weekendExcludedCount,
      systemWeekendExcludedCount: systemDerived.weekendExcludedCount,
      segmentTypeOptions: userDerived.segmentTypeOptions,
      normalizedSelectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,

      filteredBaseSegments: userFilters.filteredBaseSegments,
      ganttVisibleSegments: userFilters.ganttVisibleSegments,
      systemFilteredBaseSegments: systemFilters.filteredBaseSegments,
      systemFileLevelSegments: systemFileFilters.filteredBaseSegments,

      chartBaseSegments: userMetrics.chartBaseSegments,
      kpis: userMetrics.kpis,
      flowRows: userMetrics.flowRows,
      contributionRows: userMetrics.contributionRows,
      workloadContributors: userMetrics.workloadContributors,
      systemFlowRows: systemMetrics.flowRows,
    };
  }
};

expose(api);
