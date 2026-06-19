import { useMemo } from 'react';
import { extractFileNameFromSheetKey, isIdleContextSegment, toTimelineLane } from '@/lib/utils.js';
import { toSegmentGroup } from '@/features/dashboard/utils/segmentData.js';

export function useDashboardFilters(parsedSegments, filters) {
  const {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes,
    showIdle,
    dateRangeBounds,
    excludeWeekends,
  } = filters;

  const filteredBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];

    const fileSet = new Set(selectedFiles);
    const sheetSet = new Set(selectedSheets);
    const userSet = new Set(selectedUsers);

    if (fileSet.size === 0 && sheetSet.size === 0) return [];

    const filesWithSpecificSheets = new Set();
    for (const sheetKey of selectedSheets) {
      filesWithSpecificSheets.add(extractFileNameFromSheetKey(sheetKey));
    }

    return parsedSegments.filter((segment) => {
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
  }, [parsedSegments, dateRangeBounds, selectedFiles, selectedSheets, selectedUsers, excludeWeekends]);

  const ganttVisibleSegments = useMemo(() => {
    return filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      const segmentGroup = toSegmentGroup(segmentType);
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
      return true;
    });
  }, [filteredBaseSegments, showIdle, selectedSegmentTypes]);

  return {
    filteredBaseSegments,
    ganttVisibleSegments,
  };
}
