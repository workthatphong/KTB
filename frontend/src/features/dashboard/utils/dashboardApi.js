import { requestJson } from '@/lib/api.js';

export async function fetchDashboardPayload(options = {}) {
  const params = new URLSearchParams();
  if (options.includeDebug) params.set('includeDebug', '1');
  if (options.refreshSnapshot !== false) params.set('refreshSnapshot', '1');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const payload = await requestJson(`/api/dashboard${query}`);

  return {
    sources: payload.sources || [],
    performance: payload.performance || null,
    connections: payload.connections || [],
    healthInfo: payload.healthInfo || null,
    healthError: '',
    debugInfo: options.includeDebug ? (payload.debugInfo || null) : null,
  };
}

export async function triggerGSheetSync(options = {}) {
  return requestJson('/api/gsheet/sync', {
    method: 'POST',
    timeoutMs: options.timeoutMs,
  });
}
