import { DAY_MS } from './constants.js';

export function isWeekendSegment(segment) {
  const startDay = new Date(segment.rawStartTs ?? segment.startTs).getDay();
  const endDay = new Date(segment.rawEndTs ?? segment.endTs).getDay();
  return startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6;
}

export function getLocalDayStartTs(ts) {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getNextLocalDayStartTs(ts) {
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
