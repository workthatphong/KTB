// @ts-nocheck
import { toTimelineLane } from '@/lib/utils';
import { DAY_WINDOW_MAP } from './constants';

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
