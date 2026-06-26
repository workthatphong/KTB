// @ts-nocheck
import { expose } from 'comlink';
import { computeDerivedData, computeFilters, computeMetrics } from './workerCalculations';

const api = {
  processAllDashboardData(params: any) {
    const { sources, performance, filterState } = params;

    const userDerived = computeDerivedData({
      sources,
      performance,
      datePreset: filterState.datePreset,
      dateStart: filterState.dateStart,
      dateEnd: filterState.dateEnd,
      excludeWeekends: filterState.excludeWeekends,
      selectedFiles: filterState.selectedFiles,
      selectedSheets: filterState.selectedSheets,
      selectedSegmentTypes: filterState.selectedSegmentTypes,
    });

    const systemDerived = computeDerivedData({
      sources,
      performance,
      datePreset: filterState.systemDatePreset,
      dateStart: filterState.systemDateStart,
      dateEnd: filterState.systemDateEnd,
      excludeWeekends: filterState.systemExcludeWeekends,
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: Array.from(new Set([...(filterState.systemSelectedSheets || []), ...(filterState.systemSelectedSheetsSet2 || [])])),
      selectedSegmentTypes: [],
    });

    const systemSecondDerived = computeDerivedData({
      sources,
      performance,
      datePreset: filterState.systemDatePreset,
      dateStart: filterState.systemDateStart,
      dateEnd: filterState.systemDateEnd,
      excludeWeekends: filterState.systemExcludeWeekends,
      selectedFiles: filterState.systemSecondSelectedFiles,
      selectedSheets: Array.from(new Set([...(filterState.systemSecondSelectedSheets || []), ...(filterState.systemSecondSelectedSheetsSet2 || [])])),
      selectedSegmentTypes: [],
    });

    const userFilters = computeFilters(userDerived.parsedSegments, {
      selectedFiles: filterState.selectedFiles,
      selectedSheets: filterState.selectedSheets,
      selectedUsers: filterState.selectedUsers,
      selectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,
      showIdle: filterState.showIdle,
      dateRangeBounds: userDerived.dateRangeBounds,
      excludeWeekends: filterState.excludeWeekends,
    });

    const systemFiltersSet1 = computeFilters(systemDerived.parsedSegments, {
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: filterState.systemSelectedSheets || [],
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const systemFiltersSet2 = filterState.systemSelectedSheetsSet2?.length > 0 ? computeFilters(systemDerived.parsedSegments, {
      selectedFiles: [],
      selectedSheets: filterState.systemSelectedSheetsSet2,
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    }) : { filteredBaseSegments: [], ganttVisibleSegments: [] };

    const systemFilters = {
      filteredBaseSegments: [...systemFiltersSet1.filteredBaseSegments, ...systemFiltersSet2.filteredBaseSegments],
      ganttVisibleSegments: [...systemFiltersSet1.ganttVisibleSegments, ...systemFiltersSet2.ganttVisibleSegments],
    };

    const systemSecondFiltersSet1 = computeFilters(systemSecondDerived.parsedSegments, {
      selectedFiles: filterState.systemSecondSelectedFiles,
      selectedSheets: filterState.systemSecondSelectedSheets || [],
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemSecondDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const systemSecondFiltersSet2 = filterState.systemSecondSelectedSheetsSet2?.length > 0 ? computeFilters(systemSecondDerived.parsedSegments, {
      selectedFiles: [],
      selectedSheets: filterState.systemSecondSelectedSheetsSet2,
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemSecondDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    }) : { filteredBaseSegments: [], ganttVisibleSegments: [] };

    const systemSecondFilters = {
      filteredBaseSegments: [...systemSecondFiltersSet1.filteredBaseSegments, ...systemSecondFiltersSet2.filteredBaseSegments],
      ganttVisibleSegments: [...systemSecondFiltersSet1.ganttVisibleSegments, ...systemSecondFiltersSet2.ganttVisibleSegments],
    };

    const systemFileFilters = computeFilters(systemDerived.parsedSegments, {
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: [],
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const userMetrics = computeMetrics({
      filteredBaseSegments: userFilters.filteredBaseSegments,
      showWorkloadIdle: filterState.showWorkloadIdle,
      selectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,
    });

    const systemMetrics = computeMetrics({
      filteredBaseSegments: systemFilters.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    const systemMetricsSet1 = computeMetrics({
      filteredBaseSegments: systemFiltersSet1.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    const systemMetricsSet2 = computeMetrics({
      filteredBaseSegments: systemFiltersSet2.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    const systemSecondMetrics = computeMetrics({
      filteredBaseSegments: systemSecondFilters.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    const systemSecondMetricsSet1 = computeMetrics({
      filteredBaseSegments: systemSecondFiltersSet1.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    const systemSecondMetricsSet2 = computeMetrics({
      filteredBaseSegments: systemSecondFiltersSet2.filteredBaseSegments,
      showWorkloadIdle: true,
      selectedSegmentTypes: [],
    });

    return {
      invalidSheetCounts: userDerived.invalidSheetCounts,
      parsedSegments: userDerived.parsedSegments,
      documentTree: userDerived.documentTree,
      systemDocumentTree: systemDerived.documentTree,
      userOptions: userDerived.userOptions,
      dateRangeBounds: userDerived.dateRangeBounds,
      weekendExcludedCount: userDerived.weekendExcludedCount,
      systemWeekendExcludedCount: systemDerived.weekendExcludedCount,
      segmentTypeOptions: userDerived.segmentTypeOptions,
      normalizedSelectedSegmentTypes: userDerived.normalizedSelectedSegmentTypes,

      filteredBaseSegments: userFilters.filteredBaseSegments,
      ganttVisibleSegments: userFilters.ganttVisibleSegments,
      systemFilteredBaseSegments: systemFilters.filteredBaseSegments,
      systemFilteredBaseSegmentsSet1: systemFiltersSet1.filteredBaseSegments,
      systemFilteredBaseSegmentsSet2: systemFiltersSet2.filteredBaseSegments,
      systemSecondFilteredBaseSegments: systemSecondFilters.filteredBaseSegments,
      systemSecondFilteredBaseSegmentsSet1: systemSecondFiltersSet1.filteredBaseSegments,
      systemSecondFilteredBaseSegmentsSet2: systemSecondFiltersSet2.filteredBaseSegments,
      systemFileLevelSegments: systemFileFilters.filteredBaseSegments,

      chartBaseSegments: userMetrics.chartBaseSegments,
      kpis: userMetrics.kpis,
      flowRows: userMetrics.flowRows,
      contributionRows: userMetrics.contributionRows,
      workloadContributors: userMetrics.workloadContributors,
      systemFlowRows: systemMetrics.flowRows,
      systemContributionRows: systemMetrics.contributionRows,
      systemContributionRowsSet1: systemMetricsSet1.contributionRows,
      systemContributionRowsSet2: systemMetricsSet2.contributionRows,
      systemSecondContributionRows: systemSecondMetrics.contributionRows,
      systemSecondContributionRowsSet1: systemSecondMetricsSet1.contributionRows,
      systemSecondContributionRowsSet2: systemSecondMetricsSet2.contributionRows,
    };
  }
};

expose(api);
