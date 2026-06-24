// @ts-nocheck
import { useState } from 'react';

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
    setUserErrorMessage,
  };
}
