import { useDashboardFilterState } from './useDashboardFilterState.js';
import { useDashboardDataState } from './useDashboardDataState.js';
import { useDashboardDataFetching } from './useDashboardDataFetching.js';
import { useDashboardDerivedData } from '../features/dashboard/hooks/useDashboardDerivedData.js';
import { useDashboardFilters } from '../features/dashboard/hooks/useDashboardFilters.js';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashboardMetrics.js';

export function useDashboardData() {
  const filterState = useDashboardFilterState();
  const dataState = useDashboardDataState();
  const fetching = useDashboardDataFetching({ state: dataState });

  const {
    invalidSheetCounts,
    parsedSegments,
    documentTree,
    userOptions,
    dateRangeBounds,
    weekendExcludedCount,
    segmentTypeOptions,
    normalizedSelectedSegmentTypes,
  } = useDashboardDerivedData({
    sources: dataState.sources,
    performance: dataState.performance,
    datePreset: filterState.datePreset,
    dateStart: filterState.dateStart,
    dateEnd: filterState.dateEnd,
    excludeWeekends: filterState.excludeWeekends,
    selectedFiles: filterState.selectedFiles,
    selectedSheets: filterState.selectedSheets,
    selectedSegmentTypes: filterState.selectedSegmentTypes,
  });

  const {
    parsedSegments: systemParsedSegments,
    documentTree: systemDocumentTree,
    dateRangeBounds: systemDateRangeBounds,
    weekendExcludedCount: systemWeekendExcludedCount,
  } = useDashboardDerivedData({
    sources: dataState.sources,
    performance: dataState.performance,
    datePreset: filterState.systemDatePreset,
    dateStart: filterState.systemDateStart,
    dateEnd: filterState.systemDateEnd,
    excludeWeekends: filterState.systemExcludeWeekends,
    selectedFiles: filterState.systemSelectedFiles,
    selectedSheets: filterState.systemSelectedSheets,
    selectedSegmentTypes: [],
  });

  const { filteredBaseSegments, ganttVisibleSegments } = useDashboardFilters(parsedSegments, {
    selectedFiles: filterState.selectedFiles,
    selectedSheets: filterState.selectedSheets,
    selectedUsers: filterState.selectedUsers,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    showIdle: filterState.showIdle,
    dateRangeBounds,
    excludeWeekends: filterState.excludeWeekends,
  });

  const { filteredBaseSegments: systemFilteredBaseSegments } = useDashboardFilters(systemParsedSegments, {
    selectedFiles: filterState.systemSelectedFiles,
    selectedSheets: filterState.systemSelectedSheets,
    selectedUsers: [],
    selectedSegmentTypes: [],
    showIdle: true,
    dateRangeBounds: systemDateRangeBounds,
    excludeWeekends: filterState.systemExcludeWeekends,
  });

  const { filteredBaseSegments: systemFileLevelSegments } = useDashboardFilters(systemParsedSegments, {
    selectedFiles: filterState.systemSelectedFiles,
    selectedSheets: [],
    selectedUsers: [],
    selectedSegmentTypes: [],
    showIdle: true,
    dateRangeBounds: systemDateRangeBounds,
    excludeWeekends: filterState.systemExcludeWeekends,
  });

  const {
    chartBaseSegments,
    kpiData,
    flowRows,
    contributionRows,
    workloadContributors,
  } = useDashboardMetrics({
    filteredBaseSegments,
    showWorkloadIdle: filterState.showWorkloadIdle,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
  });

  const {
    flowRows: systemFlowRows,
  } = useDashboardMetrics({
    filteredBaseSegments: systemFilteredBaseSegments,
    showWorkloadIdle: true,
    selectedSegmentTypes: [],
  });

  return {
    ...dataState,
    setErrorMessage: dataState.setUserErrorMessage,
    ...filterState,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    documentTree,
    systemDocumentTree,
    userOptions,
    weekendExcludedCount,
    systemWeekendExcludedCount,
    segmentTypeOptions,
    invalidSheetCounts,
    ganttVisibleSegments,
    systemFilteredBaseSegments,
    systemFileLevelSegments,
    chartBaseSegments,
    kpiData,
    filteredBaseSegments,
    flowRows,
    systemFlowRows,
    contributionRows,
    workloadContributors,
    refreshAll: fetching.refreshAll,
  };
}
