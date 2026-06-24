// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { requestJson } from '@/lib/api.js';

function getSavedState(key, defaultValue, remoteSettings) {
  if (remoteSettings && remoteSettings[key] !== undefined) {
    return remoteSettings[key];
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load saved state for " + key, e);
  }
  return defaultValue;
}

export function usePersistentState(key, defaultValue, remoteSettings = null) {
  const [state, setState] = useState(() => getSavedState(key, defaultValue, remoteSettings));

  // Sync state if remoteSettings updates from server (e.g., initial fetch completes)
  useEffect(() => {
    if (remoteSettings && remoteSettings[key] !== undefined) {
      if (remoteSettings[key] !== state) {
        setState(remoteSettings[key]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSettings, key]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state for " + key, e);
    }
    
    // Sync to backend globally without awaiting
    requestJson('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ [key]: state })
    }).catch(e => console.error("Failed to sync setting to backend", e));

  }, [key, state]);

  return [state, setState];
}
