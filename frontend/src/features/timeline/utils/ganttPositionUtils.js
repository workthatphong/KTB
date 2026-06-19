export function buildGanttPositionedBars(config) {
  const {
    lanes,
    laneToSegments,
    singleLane,
    stackOverlapsInSingleLane,
    compactTs,
    displayMinTs,
    displayMaxTs,
    baseCompactedTs,
    pxPerMs,
    timelinePadLeft,
  } = config;

  const allSegments = [];
  lanes.forEach((lane) => {
    const bars = laneToSegments[lane] || [];
    bars.forEach((segment) => {
      allSegments.push({ lane, segment });
    });
  });

  allSegments.sort((a, b) => a.segment.startTs - b.segment.startTs);

  let globalLastRight = -1;
  let globalLastEndTs = -1;
  let currentGlobalShift = 0; // Tracks staircase offset to keep stacked bars aligned and drift-free during zoom
  
  const positionedByLane = {};
  const laneStackDepths = {};
  lanes.forEach((lane) => { positionedByLane[lane] = []; });
  lanes.forEach((lane) => { laneStackDepths[lane] = 1; });

  allSegments.forEach(({ lane, segment }) => {
    const x1 = timelinePadLeft + (compactTs(Math.max(segment.startTs, displayMinTs)) - baseCompactedTs) * pxPerMs;
    const x2 = timelinePadLeft + (compactTs(Math.min(segment.endTs, displayMaxTs)) - baseCompactedTs) * pxPerMs;

    let x = x1;
    
    // Dynamic minimum width: ensure visibility
    const durationSecs = Math.max(1, segment.durationSeconds || ((segment.endTs - segment.startTs) / 1000));
    const minWidth = 8 + (Math.log10(durationSecs) * 4);
    const width = Math.max(minWidth, x2 - x1);

    if (segment.startTs < globalLastEndTs) {
      // Overlap case: Apply the same staircase shift as the current group to keep them aligned (ซ้อนกัน)
      // and ensure they scale perfectly with the rest of the bars during zoom.
      x = x1 + currentGlobalShift;
    } else {
      // Non-overlap case: Maintain original staircase flow (ดังเดิม)
      if (x < globalLastRight + 1.5) {
        x = globalLastRight + 1.5;
      }
      currentGlobalShift = x - x1;
    }

    positionedByLane[lane].push({ s: segment, x, w: width });
    
    // Update global trackers to ensure the next non-overlapping bar is pushed correctly
    globalLastRight = Math.max(globalLastRight, x + width);
    globalLastEndTs = Math.max(globalLastEndTs, segment.endTs);
  });

  if (singleLane && stackOverlapsInSingleLane) {
    lanes.forEach((lane) => {
      const activeRightByLevel = [];
      positionedByLane[lane] = (positionedByLane[lane] || []).map((positioned) => {
        let stackLevel = 0;
        while ((activeRightByLevel[stackLevel] ?? -Infinity) > positioned.x) {
          stackLevel += 1;
        }
        activeRightByLevel[stackLevel] = positioned.x + positioned.w;
        laneStackDepths[lane] = Math.max(laneStackDepths[lane], stackLevel + 1);
        return { ...positioned, stackLevel };
      });
    });
  }

  return { positionedByLane, laneStackDepths };
}

