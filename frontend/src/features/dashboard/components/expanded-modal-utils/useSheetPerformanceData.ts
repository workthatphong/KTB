// @ts-nocheck
import { useMemo } from 'react';
import {
  buildSheetPerformanceChartsData,
  getTotalTimeChartAppearance,
  getUserTimeChartAppearance,
  getSystemTimeChartAppearance,
  getIdleTimeChartAppearance,
  isUserTimeCountMode,
  selectUserTimeChartData,
  selectTotalTimeChartData,
  selectSystemTimeChartData,
  selectIdleTimeChartData,
  sortSheetPerformanceChartData
} from '../../utils/sheetPerformanceCharts.js';

export function useSheetPerformanceData(
  sheetPerformanceSegments,
  sheetPerformanceUnfilteredSegments,
  sheetPerformanceChartSettings
) {
  const sheetPerformanceChartData = useMemo(
    () => buildSheetPerformanceChartsData(sheetPerformanceSegments),
    [sheetPerformanceSegments]
  );

  const unfilteredSheetPerformanceChartData = useMemo(
    () => buildSheetPerformanceChartsData(sheetPerformanceUnfilteredSegments || []),
    [sheetPerformanceUnfilteredSegments]
  );

  const sortedSheetPerformanceChartData = useMemo(() => ({
    totalTimeData: sortSheetPerformanceChartData(selectTotalTimeChartData(sheetPerformanceChartData.totalTimeData, sheetPerformanceChartSettings?.totalTime?.mode), sheetPerformanceChartSettings?.totalTime?.sortOrder),
    userTimeData: sortSheetPerformanceChartData(selectUserTimeChartData(sheetPerformanceChartData.userTimeData, sheetPerformanceChartSettings?.userTime?.mode), sheetPerformanceChartSettings?.userTime?.sortOrder),
    systemTimeData: sortSheetPerformanceChartData(selectSystemTimeChartData(sheetPerformanceChartData.systemTimeData, sheetPerformanceChartSettings?.systemTime?.mode), sheetPerformanceChartSettings?.systemTime?.sortOrder),
    idleTimeData: sortSheetPerformanceChartData(selectIdleTimeChartData(sheetPerformanceChartData.idleTimeData, sheetPerformanceChartSettings?.idleTime?.mode), sheetPerformanceChartSettings?.idleTime?.sortOrder),
  }), [sheetPerformanceChartData, sheetPerformanceChartSettings]);

  const appearances = useMemo(() => ({
    userTimeAppearance: sheetPerformanceChartSettings?.userTime?.mode && sheetPerformanceChartSettings.userTime.mode !== 'all'
      ? getUserTimeChartAppearance(sheetPerformanceChartSettings.userTime.mode)
      : null,
    isSheetUserTimeCountMode: isUserTimeCountMode(sheetPerformanceChartSettings?.userTime?.mode),
    totalTimeAppearance: sheetPerformanceChartSettings?.totalTime?.mode && sheetPerformanceChartSettings.totalTime.mode !== 'all'
      ? getTotalTimeChartAppearance(sheetPerformanceChartSettings.totalTime.mode)
      : null,
    systemTimeAppearance: sheetPerformanceChartSettings?.systemTime?.mode && sheetPerformanceChartSettings.systemTime.mode !== 'all'
      ? getSystemTimeChartAppearance(sheetPerformanceChartSettings.systemTime.mode)
      : null,
    idleTimeAppearance: sheetPerformanceChartSettings?.idleTime?.mode && sheetPerformanceChartSettings.idleTime.mode !== 'all'
      ? getIdleTimeChartAppearance(sheetPerformanceChartSettings.idleTime.mode)
      : null,
  }), [sheetPerformanceChartSettings]);

  return {
    sheetPerformanceChartData,
    unfilteredSheetPerformanceChartData,
    sortedSheetPerformanceChartData,
    ...appearances
  };
}
