// @ts-nocheck
import { useMemo } from 'react';
import {
  applyWeekendExclusionToSegments,
  buildDocumentTree,
  buildUserOptions,
  getDateRangeBounds,
  normalizeSelectedSegmentTypes,
  parseSegments,
  SEGMENT_GROUP_OPTIONS,
} from '../utils/segmentData.js';

export function useDashboardDerivedData(params) {
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

  const normalizedSelectedSegmentTypes = useMemo(
    () => normalizeSelectedSegmentTypes(selectedSegmentTypes),
    [selectedSegmentTypes]
  );

  const rawParsedSegments = useMemo(() => parseSegments(segments), [segments]);

  const weekendAdjusted = useMemo(
    () => (excludeWeekends ? applyWeekendExclusionToSegments(rawParsedSegments) : { segments: rawParsedSegments, affectedCount: 0 }),
    [excludeWeekends, rawParsedSegments]
  );

  const parsedSegments = weekendAdjusted.segments;

  const documentTree = useMemo(
    () => buildDocumentTree(sources, parsedSegments),
    [sources, parsedSegments]
  );

  const userOptions = useMemo(
    () => buildUserOptions({
      parsedSegments,
      selectedSheets,
      selectedFiles,
      datePreset,
      dateStart,
      dateEnd,
      excludeWeekends,
    }),
    [parsedSegments, selectedSheets, selectedFiles, datePreset, dateStart, dateEnd, excludeWeekends]
  );

  const dateRangeBounds = useMemo(
    () => getDateRangeBounds(rawParsedSegments, datePreset, dateStart, dateEnd),
    [rawParsedSegments, datePreset, dateStart, dateEnd]
  );

  const weekendExcludedCount = excludeWeekends ? weekendAdjusted.affectedCount : 0;

  const segmentTypeOptions = useMemo(() => SEGMENT_GROUP_OPTIONS, []);

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
