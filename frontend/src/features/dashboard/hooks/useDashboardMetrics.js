import { useMemo } from 'react';
import {
  buildKpiData,
  buildKpisFromSegments,
  isIdleContextSegment,
  safeNumber,
  toTimelineLane,
} from '../../../lib/utils.js';
import { initialKpiData } from '../../../lib/constants.js';
import { calculateFlowRows, calculateUserStatsRows } from '../utils/dataParsers.js';
import { toSegmentGroup } from '../utils/segmentData.js';

export function useDashboardMetrics(params) {
  const {
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes,
  } = params;

  const chartBaseSegments = useMemo(() => {
    return filteredBaseSegments.filter((segment) => {
      const segmentGroup = toSegmentGroup(segment.segmentType);
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
      return true;
    });
  }, [filteredBaseSegments, selectedSegmentTypes]);

  const kpiData = useMemo(() => {
    const kpis = chartBaseSegments.length > 0 ? buildKpisFromSegments(chartBaseSegments) : null;
    return kpis ? buildKpiData(kpis) : initialKpiData;
  }, [chartBaseSegments]);

  const flowRows = useMemo(() => calculateFlowRows(chartBaseSegments), [chartBaseSegments]);

  const userStatsRows = useMemo(() => calculateUserStatsRows(chartBaseSegments), [chartBaseSegments]);

  const contributionRows = useMemo(() => userStatsRows.map((row) => ({ ...row })), [userStatsRows]);

  const workloadContributors = useMemo(() => {
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

    return Array.from(laneDurationMap.entries())
      .map(([user, totalSeconds]) => ({ user, totalSeconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [chartBaseSegments, showWorkloadIdle]);

  return {
    chartBaseSegments,
    kpiData,
    flowRows,
    contributionRows,
    workloadContributors,
  };
}
