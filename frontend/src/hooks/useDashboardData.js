import { startTransition, useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { fetchDashboardPayload, triggerGSheetSync } from '../features/dashboard/utils/dashboardApi.js';
import { useDashboardDerivedData } from '../features/dashboard/hooks/useDashboardDerivedData.js';
import { useDashboardFilters } from '../features/dashboard/hooks/useDashboardFilters.js';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashboardMetrics.js';

function normalizeUserErrorMessage(message) {
  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) return 'Refresh failed';
  return trimmedMessage;
}

export function useDashboardData() {
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

  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all');
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '');
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '');
  const [excludeWeekends, setExcludeWeekends] = usePersistentState('filter_excludeWeekends', false);
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', []);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', []);
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', []);
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', []);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', false);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false);
  const [pinnedFiles, setPinnedFiles] = usePersistentState('filter_pinnedFiles', []);
  const [pinnedSheets, setPinnedSheets] = usePersistentState('filter_pinnedSheets', []);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');
  const [fileDisplayNames, setFileDisplayNames] = usePersistentState('filter_fileDisplayNames', {});
  const [pageDisplayNames, setPageDisplayNames] = usePersistentState('filter_pageDisplayNames', {});

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
    sources,
    performance,
    datePreset,
    dateStart,
    dateEnd,
    excludeWeekends,
    selectedFiles,
    selectedSheets,
    selectedSegmentTypes,
  });

  const { filteredBaseSegments, ganttVisibleSegments } = useDashboardFilters(parsedSegments, {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    showIdle,
    dateRangeBounds,
    excludeWeekends,
  });

  const {
    chartBaseSegments,
    kpiData,
    flowRows,
    contributionRows,
    workloadContributors,
  } = useDashboardMetrics({
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
  });

  const buildSupabaseErrorMessage = (healthInfo) => {
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
  };

  const loadDashboardPayload = async (options = {}) => {
    const payload = await fetchDashboardPayload({
      includeDebug: Boolean(options.includeDebug),
      refreshSnapshot: Boolean(options.refreshSnapshot),
    });

    startTransition(() => {
      setSources(payload.sources);
      setPerformance(payload.performance);
      setGsheetConnections(payload.connections);
      setHealthInfo(payload.healthInfo);
      setSupabaseError(buildSupabaseErrorMessage(payload.healthInfo));

      if (payload.healthError) {
        setBackendWarning(`Health error: ${payload.healthError}`);
      }

      if (options.includeDebug) {
        setDebugInfo(payload.debugInfo);
      }
    });
  };

  const syncGSheet = async (options = {}) => {
    setSyncing(true);
    try {
      await triggerGSheetSync({ timeoutMs: options.timeoutMs });
    } finally {
      setSyncing(false);
    }
  };

  const refreshAll = async (options = {}) => {
    setLoading(true);
    try {
      if (options.syncFirst !== false) {
        await syncGSheet({ timeoutMs: options.syncTimeoutMs });
      }
      await loadDashboardPayload(options);
      if (options.showRefreshPagePrompt) setShowRefreshPagePrompt(true);

      if (options.backgroundSync) {
        syncGSheet({ timeoutMs: options.syncTimeoutMs })
          .then(() => loadDashboardPayload(options))
          .catch((error) => setBackendWarning(`Background sync error: ${error.message || 'Sync failed'}`));
      }
    } catch (error) {
      setUserErrorMessage(error.message || 'Refresh failed', error);
    } finally {
      setLoading(false);
      if (!options.backgroundSync) setSyncing(false);
      setIsInitialLoadDone(true);
    }
  };

  useEffect(() => {
    refreshAll({ syncFirst: false, backgroundSync: false });
  }, []);

  return {
    sources,
    gsheetConnections,
    performance,
    healthInfo,
    debugInfo,
    loading,
    syncing,
    errorMessage,
    supabaseError,
    backendWarning,
    debugFetchError,
    isInitialLoadDone,
    showRefreshPagePrompt,
    setShowRefreshPagePrompt,
    datePreset,
    setDatePreset,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    excludeWeekends,
    setExcludeWeekends,
    selectedFiles,
    setSelectedFiles,
    selectedSheets,
    setSelectedSheets,
    selectedUsers,
    setSelectedUsers,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    setSelectedSegmentTypes,
    showIdle,
    setShowIdle,
    showWorkloadIdle,
    setShowWorkloadIdle,
    showWorkloadSystem,
    setShowWorkloadSystem,
    pinnedFiles,
    setPinnedFiles,
    pinnedSheets,
    setPinnedSheets,
    activeDocumentFile,
    setActiveDocumentFile,
    fileDisplayNames,
    setFileDisplayNames,
    pageDisplayNames,
    setPageDisplayNames,
    documentTree,
    userOptions,
    weekendExcludedCount,
    segmentTypeOptions,
    invalidSheetCounts,
    ganttVisibleSegments,
    chartBaseSegments,
    kpiData,
    filteredBaseSegments,
    flowRows,
    contributionRows,
    workloadContributors,
    refreshAll,
    setErrorMessage: setUserErrorMessage,
  };
}
