import os

base_dir = '/workspaces/KTB/frontend/src/hooks'
filepath = os.path.join(base_dir, 'useDashboardData.js')

with open(filepath, 'r') as f:
    content = f.read()

# 1. useDashboardFilterState.js
filter_state_content = """import { usePersistentState } from './usePersistentState.js';

export function useDashboardFilterState() {
  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all');
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '');
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '');
  const [excludeWeekends, setExcludeWeekends] = usePersistentState('filter_excludeWeekends', false);
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', []);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', []);
  const [systemDatePreset, setSystemDatePreset] = usePersistentState('system_filter_datePreset', 'all');
  const [systemDateStart, setSystemDateStart] = usePersistentState('system_filter_dateStart', '');
  const [systemDateEnd, setSystemDateEnd] = usePersistentState('system_filter_dateEnd', '');
  const [systemExcludeWeekends, setSystemExcludeWeekends] = usePersistentState('system_filter_excludeWeekends', false);
  const [systemSelectedFiles, setSystemSelectedFiles] = usePersistentState('system_filter_selectedFiles', []);
  const [systemSelectedSheets, setSystemSelectedSheets] = usePersistentState('system_filter_selectedSheets', []);
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', []);
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', []);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', false);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false);
  const [pinnedFiles, setPinnedFiles] = usePersistentState('filter_pinnedFiles', []);
  const [pinnedSheets, setPinnedSheets] = usePersistentState('filter_pinnedSheets', []);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');
  const [systemPinnedFiles, setSystemPinnedFiles] = usePersistentState('system_filter_pinnedFiles', []);
  const [systemPinnedSheets, setSystemPinnedSheets] = usePersistentState('system_filter_pinnedSheets', []);
  const [systemActiveDocumentFile, setSystemActiveDocumentFile] = usePersistentState('system_filter_activeDocumentFile', '');
  const [fileDisplayNames, setFileDisplayNames] = usePersistentState('filter_fileDisplayNames', {});
  const [pageDisplayNames, setPageDisplayNames] = usePersistentState('filter_pageDisplayNames', {});

  return {
    datePreset, setDatePreset,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    excludeWeekends, setExcludeWeekends,
    selectedFiles, setSelectedFiles,
    selectedSheets, setSelectedSheets,
    systemDatePreset, setSystemDatePreset,
    systemDateStart, setSystemDateStart,
    systemDateEnd, setSystemDateEnd,
    systemExcludeWeekends, setSystemExcludeWeekends,
    systemSelectedFiles, setSystemSelectedFiles,
    systemSelectedSheets, setSystemSelectedSheets,
    selectedUsers, setSelectedUsers,
    selectedSegmentTypes, setSelectedSegmentTypes,
    showIdle, setShowIdle,
    showWorkloadIdle, setShowWorkloadIdle,
    showWorkloadSystem, setShowWorkloadSystem,
    pinnedFiles, setPinnedFiles,
    pinnedSheets, setPinnedSheets,
    activeDocumentFile, setActiveDocumentFile,
    systemPinnedFiles, setSystemPinnedFiles,
    systemPinnedSheets, setSystemPinnedSheets,
    systemActiveDocumentFile, setSystemActiveDocumentFile,
    fileDisplayNames, setFileDisplayNames,
    pageDisplayNames, setPageDisplayNames,
  };
}
"""
with open(os.path.join(base_dir, 'useDashboardFilterState.js'), 'w') as f:
    f.write(filter_state_content)

# 2. useDashboardDataState.js
data_state_content = """import { useState } from 'react';

export function normalizeUserErrorMessage(message) {
  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) return 'Refresh failed';
  return trimmedMessage;
}

export function buildSupabaseErrorMessage(healthInfo) {
  const supabase = healthInfo?.supabase;
  if (!supabase) return '';

  const reason = String(supabase.error || supabase.reason || '').trim();
  const syncError = String(supabase.lastSyncError || '').trim();
  if (supabase.enabled && supabase.clientReady && supabase.lastSyncOk === false) {
    return `Supabase sync failed${syncError ? `: ${syncError}` : ''}. Current data may disappear after server restart because only SQLite was updated.`;
  }
  if (supabase.enabled && !supabase.clientReady) {
    return `Supabase connection failed${reason ? `: ${reason}` : ''}. System is using SQLite fallback.`;
  }
  if (supabase.configured && !supabase.enabled) {
    return `Supabase configuration is invalid${reason ? `: ${reason}` : ''}. System is using SQLite fallback.`;
  }
  return '';
}

export function useDashboardDataState() {
  const [sources, setSources] = useState([]);
  const [gsheetConnections, setGsheetConnections] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [supabaseError, setSupabaseError] = useState('');
  const [backendWarning, setBackendWarning] = useState('');
  const [debugFetchError, setDebugFetchError] = useState('');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [showRefreshPagePrompt, setShowRefreshPagePrompt] = useState(false);

  const setUserErrorMessage = (message, errorLike = null) => {
    if (errorLike?.isTimeout) {
      setErrorMessage('');
      return;
    }
    setErrorMessage(normalizeUserErrorMessage(message));
  };

  return {
    sources, setSources,
    gsheetConnections, setGsheetConnections,
    performance, setPerformance,
    healthInfo, setHealthInfo,
    debugInfo, setDebugInfo,
    loading, setLoading,
    syncing, setSyncing,
    errorMessage, setErrorMessage,
    supabaseError, setSupabaseError,
    backendWarning, setBackendWarning,
    debugFetchError, setDebugFetchError,
    isInitialLoadDone, setIsInitialLoadDone,
    showRefreshPagePrompt, setShowRefreshPagePrompt,
    setUserErrorMessage,
  };
}
"""
with open(os.path.join(base_dir, 'useDashboardDataState.js'), 'w') as f:
    f.write(data_state_content)

# 3. useDashboardDataFetching.js
data_fetching_content = """import { startTransition, useEffect } from 'react';
import { fetchDashboardPayload, triggerGSheetSync } from '../features/dashboard/utils/dashboardApi.js';
import { buildSupabaseErrorMessage } from './useDashboardDataState.js';

export function useDashboardDataFetching({ state }) {
  const loadDashboardPayload = async (options = {}) => {
    const payload = await fetchDashboardPayload({
      includeDebug: Boolean(options.includeDebug),
      refreshSnapshot: Boolean(options.refreshSnapshot),
    });

    startTransition(() => {
      state.setSources(payload.sources);
      state.setPerformance(payload.performance);
      state.setGsheetConnections(payload.connections);
      state.setHealthInfo(payload.healthInfo);
      state.setSupabaseError(buildSupabaseErrorMessage(payload.healthInfo));

      if (payload.healthError) {
        state.setBackendWarning(`Health error: ${payload.healthError}`);
      }

      if (options.includeDebug) {
        state.setDebugInfo(payload.debugInfo);
      }
    });
  };

  const syncGSheet = async (options = {}) => {
    state.setSyncing(true);
    try {
      await triggerGSheetSync({ timeoutMs: options.timeoutMs });
    } finally {
      state.setSyncing(false);
    }
  };

  const refreshAll = async (options = {}) => {
    state.setLoading(true);
    try {
      if (options.syncFirst !== false) {
        await syncGSheet({ timeoutMs: options.syncTimeoutMs });
      }
      await loadDashboardPayload(options);
      if (options.showRefreshPagePrompt) state.setShowRefreshPagePrompt(true);

      if (options.backgroundSync) {
        syncGSheet({ timeoutMs: options.syncTimeoutMs })
          .then(() => loadDashboardPayload(options))
          .catch((error) => state.setBackendWarning(`Background sync error: ${error.message || 'Sync failed'}`));
      }
    } catch (error) {
      state.setUserErrorMessage(error.message || 'Refresh failed', error);
    } finally {
      state.setLoading(false);
      if (!options.backgroundSync) state.setSyncing(false);
      state.setIsInitialLoadDone(true);
    }
  };

  useEffect(() => {
    refreshAll({ syncFirst: false, backgroundSync: false });
  }, []);

  return { refreshAll };
}
"""
with open(os.path.join(base_dir, 'useDashboardDataFetching.js'), 'w') as f:
    f.write(data_fetching_content)

# 4. update useDashboardData.js
proxy_content = """import { useDashboardFilterState } from './useDashboardFilterState.js';
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
"""
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("useDashboardData refactoring complete.")
