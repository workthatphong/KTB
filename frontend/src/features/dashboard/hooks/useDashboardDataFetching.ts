// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardPayload, triggerGSheetSync } from '@/features/dashboard/utils/dashboardApi';
import { buildSupabaseErrorMessage } from './useDashboardDataState';

export function useDashboardDataFetching() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const payload = await fetchDashboardPayload({ includeDebug: false, refreshSnapshot: true });
      return {
        ...payload,
        supabaseError: buildSupabaseErrorMessage(payload.healthInfo),
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const syncMutation = useMutation({
    mutationFn: async (options) => {
      await triggerGSheetSync(options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const refreshAll = async (options = {}) => {
    if (options.syncFirst !== false) {
      await syncMutation.mutateAsync({ timeoutMs: options.syncTimeoutMs }).catch(() => {});
    } else {
      await query.refetch();
    }
  };

  return {
    data: query.data || { sources: [], performance: null, connections: [], healthInfo: null, debugInfo: null },
    isLoading: query.isLoading || query.isFetching,
    isSyncing: syncMutation.isPending,
    isInitialLoadDone: query.isSuccess,
    errorMessage: query.error?.message || syncMutation.error?.message || '',
    supabaseError: query.data?.supabaseError || '',
    backendWarning: query.data?.healthError ? `Health error: ${query.data.healthError}` : '',
    refreshAll,
    syncGSheet: syncMutation.mutateAsync,
  };
}
