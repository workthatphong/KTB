import { startTransition, useEffect } from 'react';
import { fetchDashboardPayload, triggerGSheetSync } from '@/features/dashboard/utils/dashboardApi.js';
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
