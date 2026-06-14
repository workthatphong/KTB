import { useState, useEffect } from 'react';

function getSavedState(key, defaultValue) {
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

function saveState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save state for " + key, e);
  }
}

export function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => getSavedState(key, defaultValue));

  useEffect(() => {
    saveState(key, state);
  }, [key, state]);

  return [state, setState];
}
