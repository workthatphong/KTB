// @ts-nocheck
/**
 * Calculates ticks for the timeline.
 */
export const calculateTimelineTicks = (displayMinTs, displayMaxTs, effectivePxPerHour, collapseGaps, visibleSegments) => {
  const tickStepCandidatesMs = [
    30 * 60 * 1000, 60 * 60 * 1000, 2 * 60 * 60 * 1000, 3 * 60 * 60 * 1000,
    4 * 60 * 60 * 1000, 6 * 60 * 60 * 1000, 8 * 60 * 60 * 1000, 12 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ];
  const minTickPx = 120;
  const tickStepMs = tickStepCandidatesMs.find(
    (candidate) => ((candidate / (60 * 60 * 1000)) * effectivePxPerHour) >= minTickPx
  ) || (24 * 60 * 60 * 1000);
  
  const alignedTickStart = Math.floor(displayMinTs / tickStepMs) * tickStepMs;
  let ticks = [];
  for (let tickTs = alignedTickStart; tickTs <= displayMaxTs + tickStepMs; tickTs += tickStepMs) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) {
      ticks.push(tickTs);
    }
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  if (collapseGaps) {
    ticks = ticks.filter((tickTs) => {
      if (tickTs === displayMinTs || tickTs === displayMaxTs) return true;
      return visibleSegments.some((seg) => {
        return tickTs >= seg.startTs - 2 * 60 * 1000 && tickTs <= seg.endTs + 2 * 60 * 1000;
      });
    });
  }
  return ticks;
};
