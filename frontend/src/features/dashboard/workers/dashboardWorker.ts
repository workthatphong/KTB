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
      selectedSheets: filterState.systemSelectedSheets,
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
      selectedSheets: filterState.systemSecondSelectedSheets,
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

    const systemFilters = computeFilters(systemDerived.parsedSegments, {
      selectedFiles: filterState.systemSelectedFiles,
      selectedSheets: filterState.systemSelectedSheets,
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

    const systemSecondFilters = computeFilters(systemSecondDerived.parsedSegments, {
      selectedFiles: filterState.systemSecondSelectedFiles,
      selectedSheets: filterState.systemSecondSelectedSheets,
      selectedUsers: [],
      selectedSegmentTypes: [],
      showIdle: true,
      dateRangeBounds: systemSecondDerived.dateRangeBounds,
      excludeWeekends: filterState.systemExcludeWeekends,
    });

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

    const systemSecondMetrics = computeMetrics({
      filteredBaseSegments: systemSecondFilters.filteredBaseSegments,
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
      systemSecondFilteredBaseSegments: systemSecondFilters.filteredBaseSegments,
      systemFileLevelSegments: systemFileFilters.filteredBaseSegments,

      chartBaseSegments: userMetrics.chartBaseSegments,
      kpis: userMetrics.kpis,
      flowRows: userMetrics.flowRows,
      contributionRows: userMetrics.contributionRows,
      workloadContributors: userMetrics.workloadContributors,
      systemFlowRows: systemMetrics.flowRows,
      systemContributionRows: systemMetrics.contributionRows,
      systemSecondContributionRows: systemSecondMetrics.contributionRows,
    };
  }
};

expose(api);
