// @ts-nocheck
import { DAY_WINDOW_MAP } from './constants.js';

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
