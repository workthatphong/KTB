import { buildKpisFromSegments } from '../../../lib/kpiUtils.js';

export function buildSheetPerformanceChartsData(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const segmentsBySheet = new Map();

  safeSegments.forEach((segment) => {
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) return;
    if (!segmentsBySheet.has(sheetKey)) {
      segmentsBySheet.set(sheetKey, {
        name: sheetName || fileName,
        segments: [],
      });
    }
    segmentsBySheet.get(sheetKey).segments.push(segment);
  });

  const entries = Array.from(segmentsBySheet.values()).map((entry) => {
    const kpis = buildKpisFromSegments(entry.segments);
    return {
      name: entry.name,
      totalLeadTimeSeconds: Number(kpis.totalLeadTimeSeconds) || 0,
      activeUserTimeSeconds: Number(kpis.activeUserTimeSeconds) || 0,
      systemTimeSeconds: Number(kpis.systemTimeSeconds) || 0,
      idleWaitingSeconds: Number(kpis.idleWaitingSeconds) || 0,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return {
    totalTimeData: entries.map((entry) => ({ name: entry.name, value: entry.totalLeadTimeSeconds })),
    userTimeData: entries.map((entry) => ({ name: entry.name, value: entry.activeUserTimeSeconds })),
    systemTimeData: entries.map((entry) => ({ name: entry.name, value: entry.systemTimeSeconds })),
    idleTimeData: entries.map((entry) => ({ name: entry.name, value: entry.idleWaitingSeconds })),
  };
}
