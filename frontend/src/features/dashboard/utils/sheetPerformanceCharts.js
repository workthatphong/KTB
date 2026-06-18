import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { buildKpisFromSegments } from '../../../lib/kpiUtils.js';
import { toDrillGroup, toCompleteMarkerType } from '../../../lib/segmentUtils.js';

export const SHEET_PERFORMANCE_CHART_IDS = [
  'totalTime',
  'userTime',
  'systemTime',
  'idleTime',
];

export function createDefaultSheetPerformanceChartSettings() {
  return {
    totalTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
    userTime: { showAverageLine: true, sortOrder: 'default', mode: 'all' },
    systemTime: { showAverageLine: true, sortOrder: 'default' },
    idleTime: { showAverageLine: true, sortOrder: 'default' },
  };
}

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
    const userBreakdown = entry.segments.reduce((totals, segment) => {
      const drillGroup = toDrillGroup(segment.segmentType);
      const duration = Number(segment.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.uploadSeconds += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.reviewSeconds += duration;
      else if (drillGroup === 'EditData') totals.editDataSeconds += duration;
      else if (drillGroup === 'EditMeta') totals.editMetaSeconds += duration;
      return totals;
    }, { uploadSeconds: 0, reviewSeconds: 0, editDataSeconds: 0, editMetaSeconds: 0 });

    const completedSegments = entry.segments.filter(s => Boolean(toCompleteMarkerType(s)));
    const isCompleted = completedSegments.length > 0;
    
    let timeToCompleteSeconds = 0;
    if (isCompleted) {
      const maxCompleteEnd = Math.max(...completedSegments.map(s => s.endTs));
      timeToCompleteSeconds = entry.segments.reduce((sum, s) => {
        if (s.startTs >= maxCompleteEnd) return sum;
        const drillGroup = toDrillGroup(s.segmentType);
        if (['Uploading', 'Processing', 'Reprocessing', 'Review', 'ReviewAutoClose', 'EditData', 'EditMeta'].includes(drillGroup)) {
          return sum + (Number(s.durationSeconds) || 0);
        }
        return sum;
      }, 0);
    }

    return {
      name: entry.name,
      totalLeadTimeSeconds: Number(kpis.totalLeadTimeSeconds) || 0,
      activeUserTimeSeconds: Number(kpis.activeUserTimeSeconds) || 0,
      systemTimeSeconds: Number(kpis.systemTimeSeconds) || 0,
      idleWaitingSeconds: Number(kpis.idleWaitingSeconds) || 0,
      uploadSeconds: userBreakdown.uploadSeconds,
      reviewSeconds: userBreakdown.reviewSeconds,
      editDataSeconds: userBreakdown.editDataSeconds,
      editMetaSeconds: userBreakdown.editMetaSeconds,
      isCompleted,
      timeToCompleteSeconds,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return {
    totalTimeData: entries.map((entry) => ({ 
      name: entry.name, 
      value: entry.totalLeadTimeSeconds, 
      isCompleted: entry.isCompleted,
      timeToCompleteSeconds: entry.timeToCompleteSeconds 
    })),
    userTimeData: entries.map((entry) => ({
      name: entry.name,
      value: entry.activeUserTimeSeconds,
      uploadValue: entry.uploadSeconds,
      reviewValue: entry.reviewSeconds,
      editDataValue: entry.editDataSeconds,
      editMetaValue: entry.editMetaSeconds,
    })),
    systemTimeData: entries.map((entry) => ({ name: entry.name, value: entry.systemTimeSeconds })),
    idleTimeData: entries.map((entry) => ({ name: entry.name, value: entry.idleWaitingSeconds })),
  };
}

export function selectUserTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'upload') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.uploadValue) || 0 }));
  if (mode === 'review') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.reviewValue) || 0 }));
  if (mode === 'editData') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editDataValue) || 0 }));
  if (mode === 'editMeta') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editMetaValue) || 0 }));
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function selectTotalTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'complete') {
    return safeData.filter(entry => entry.isCompleted).map((entry) => ({ name: entry.name, value: Number(entry.timeToCompleteSeconds) || 0 }));
  }
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function getTotalTimeChartAppearance(mode = 'all') {
  if (mode === 'complete') {
    return {
      activeFill: '#16A34A',
      inactiveFill: '#94a3b8',
      valueLabelFill: '#16A34A',
    };
  }
  return null;
}

export function getUserTimeChartAppearance(mode = 'all') {
  if (mode === 'upload') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Uploading,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Uploading,
    };
  }
  if (mode === 'review') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Review,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Review,
    };
  }
  if (mode === 'editData') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditData,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditData,
    };
  }
  if (mode === 'editMeta') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
    };
  }
  return null;
}

export function sortSheetPerformanceChartData(data, sortOrder = 'desc') {
  const safeData = Array.isArray(data) ? data : [];
  if (sortOrder !== 'asc' && sortOrder !== 'desc') return safeData;
  const direction = sortOrder === 'asc' ? 1 : -1;
  return safeData.slice().sort((a, b) => {
    const diff = (Number(a?.value) || 0) - (Number(b?.value) || 0);
    if (diff !== 0) return diff * direction;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'th');
  });
}
