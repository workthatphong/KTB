import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { wrap } from 'comlink';
import { useDashboardFilterState } from './useDashboardFilterState';
import { useDashboardDataState } from './useDashboardDataState';
import { useDashboardDataFetching } from './useDashboardDataFetching';
import { initialKpiData } from '@/lib/constants';
import { buildKpiData } from '@/lib/utils';

import { DashboardState } from '../types';

// Initialize the worker once per module
const worker = new Worker(new URL('../workers/dashboardWorker.ts', import.meta.url), { type: 'module' });
const workerApi = wrap(worker);

export function useDashboardData(): DashboardState {
  const filterState = useDashboardFilterState();
  const dataState = useDashboardDataState();
  const fetching = useDashboardDataFetching();

  // Create a memoized parameters object to prevent unnecessary worker calls
  const workerParams = useMemo(() => ({
    sources: fetching.data.sources,
    performance: fetching.data.performance,
    filterState: {
      datePreset: filterState.datePreset,
      dateStart: filterState.dateStart,
      dateEnd: filterState.dateEnd,
      excludeWeekends: filterState.excludeWeekends,
      selectedFiles: filterState.selectedFiles,
      selectedSheets: filterState.selectedSheets,
      selectedSegmentTypes: filterState.selectedSegmentTypes,
      selectedUsers: filterState.selectedUsers,
      showIdle: filterState.showIdle,
      showWorkloadIdle: filterState.showWorkloadIdle,
      systemDatePreset: filterState.systemDatePreset,
      systemDateStart: filterState.systemDateStart,
      systemDateEnd: filterState.systemDateEnd,
      systemExcludeWeekends: filterState.systemExcludeWeekends,
      systemSelectedFiles: filterState.systemSelectedFiles,
      systemSelectedSheets: filterState.systemSelectedSheets,
      systemSecondSelectedFiles: filterState.systemSecondSelectedFiles,
      systemSecondSelectedSheets: filterState.systemSecondSelectedSheets,
    }
  }), [
    fetching.data.sources,
    fetching.data.performance,
    filterState.datePreset,
    filterState.dateStart,
    filterState.dateEnd,
    filterState.excludeWeekends,
    filterState.selectedFiles,
    filterState.selectedSheets,
    filterState.selectedSegmentTypes,
    filterState.selectedUsers,
    filterState.showIdle,
    filterState.showWorkloadIdle,
    filterState.systemDatePreset,
    filterState.systemDateStart,
    filterState.systemDateEnd,
    filterState.systemExcludeWeekends,
    filterState.systemSelectedFiles,
    filterState.systemSelectedSheets,
    filterState.systemSecondSelectedFiles,
    filterState.systemSecondSelectedSheets,
  ]);

  const workerQuery = useQuery({
    queryKey: ['dashboardWorker', workerParams],
    queryFn: () => workerApi.processAllDashboardData(workerParams),
    enabled: !!fetching.data.performance,
    placeholderData: (prev) => prev, // keep previous data while calculating
    staleTime: Infinity, // never stale, only refetches when params change
  });

  const workerData = workerQuery.data || {
    invalidSheetCounts: {},
    parsedSegments: [],
    documentTree: [],
    systemDocumentTree: [],
    userOptions: { files: [], sheets: [], users: [] },
    dateRangeBounds: { minTs: 0, maxTs: 0 },
    weekendExcludedCount: 0,
    systemWeekendExcludedCount: 0,
    segmentTypeOptions: [],
    normalizedSelectedSegmentTypes: [],
    filteredBaseSegments: [],
    ganttVisibleSegments: [],
    systemFilteredBaseSegments: [],
    systemFileLevelSegments: [],
    chartBaseSegments: [],
    kpis: null,
    flowRows: [],
    contributionRows: [],
    workloadContributors: [],
    systemFlowRows: [],
    systemContributionRows: [],
    systemSecondContributionRows: [],
  };

  const kpiData = useMemo(() => workerData.kpis ? buildKpiData(workerData.kpis) : initialKpiData, [workerData.kpis]);

  return {
    ...dataState,
    setErrorMessage: dataState.setUserErrorMessage,
    ...filterState,
    sources: fetching.data.sources,
    gsheetConnections: fetching.data.connections,
    settings: fetching.data.settings || {},
    performance: fetching.data.performance,
    healthInfo: fetching.data.healthInfo,
    debugInfo: fetching.data.debugInfo,
    loading: fetching.isLoading || workerQuery.isFetching,
    syncing: fetching.isSyncing,
    errorMessage: dataState.errorMessage || fetching.errorMessage || workerQuery.error?.message,
    supabaseError: fetching.supabaseError,
    backendWarning: dataState.backendWarning || fetching.backendWarning,
    isInitialLoadDone: fetching.isInitialLoadDone && !!workerQuery.data,
    
    // Spread worker results
    ...workerData,
    kpiData,

    refreshAll: fetching.refreshAll,
    syncGSheet: fetching.syncGSheet,
  };
}
