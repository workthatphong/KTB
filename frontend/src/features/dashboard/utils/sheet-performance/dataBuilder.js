import { buildKpisFromSegments } from '../../../../lib/kpiUtils.js';
import { toDrillGroup, toCompleteMarkerType } from '../../../../lib/segmentUtils.js';
import { USER_ACTION_TYPES } from './constants.js';

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
      const editDataItemCount = Number(segment.editDataItemCount) || 0;
      const editMetaItemCount = Number(segment.editMetaItemCount) || 0;
      if (drillGroup === 'Uploading') totals.uploadSeconds += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') {
        totals.reviewSeconds += duration;
        totals.reviewCount += 1;
      } else if (drillGroup === 'EditData') {
        totals.editDataSeconds += duration;
        totals.editDataCount += editDataItemCount || 1;
      } else if (drillGroup === 'EditMeta') {
        totals.editMetaSeconds += duration;
        totals.editMetaCount += editMetaItemCount || 1;
      }
      return totals;
    }, {
      uploadSeconds: 0,
      reviewSeconds: 0,
      editDataSeconds: 0,
      editMetaSeconds: 0,
      reviewCount: 0,
      editDataCount: 0,
      editMetaCount: 0,
    });

    const systemBreakdown = entry.segments.reduce((totals, segment) => {
      const drillGroup = toDrillGroup(segment.segmentType);
      const duration = Number(segment.durationSeconds) || 0;
      if (drillGroup === 'Processing') totals.firstSpreadSeconds += duration;
      else if (drillGroup === 'Reprocessing') totals.secondSpreadSeconds += duration;
      return totals;
    }, { firstSpreadSeconds: 0, secondSpreadSeconds: 0 });

    const sorted = [...entry.segments].sort((a, b) => (Number(a.startTs) || 0) - (Number(b.startTs) || 0));
    let firstSpreadIdle = 0;
    let secondSpreadIdle = 0;
    let reviewEditIdleSum = 0;
    let reviewEditIdleCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const currentType = String(current.segmentType || '');
      
      if (currentType === 'SYSTEM_INITIAL_PROCESSING') {
        const nextUser = sorted.find((s, idx) => idx > i && USER_ACTION_TYPES.has(s.segmentType));
        if (nextUser) firstSpreadIdle = Math.max(0, (Number(nextUser.startTs) - Number(current.endTs)) / 1000);
      }

      if (currentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2' || currentType === 'SYSTEM_SCHEDULED_REPROCESSING') {
        const nextUser = sorted.find((s, idx) => idx > i && USER_ACTION_TYPES.has(s.segmentType));
        if (nextUser) secondSpreadIdle = Math.max(0, (Number(nextUser.startTs) - Number(current.endTs)) / 1000);
      }

      if (USER_ACTION_TYPES.has(currentType)) {
        const nextUser = sorted.find((s, idx) => idx > i && USER_ACTION_TYPES.has(s.segmentType));
        if (nextUser) {
          reviewEditIdleSum += Math.max(0, (Number(nextUser.startTs) - Number(current.endTs)) / 1000);
          reviewEditIdleCount += 1;
        }
      }
    }

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
      reviewCount: userBreakdown.reviewCount,
      editDataCount: userBreakdown.editDataCount,
      editMetaCount: userBreakdown.editMetaCount,
      firstSpreadSeconds: systemBreakdown.firstSpreadSeconds,
      secondSpreadSeconds: systemBreakdown.secondSpreadSeconds,
      firstSpreadIdleSeconds: firstSpreadIdle,
      secondSpreadIdleSeconds: secondSpreadIdle,
      avgReviewEditIdleSeconds: reviewEditIdleCount > 0 ? reviewEditIdleSum / reviewEditIdleCount : 0,
      isCompleted,
      timeToCompleteSeconds,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return {
    editDataBubbleData: entries.map((entry) => ({
      name: entry.name,
      x: entry.editDataSeconds,
      y: entry.editDataCount,
      z: entry.reviewCount,
    })),
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
      reviewCountValue: entry.reviewCount,
      editDataCountValue: entry.editDataCount,
      editMetaCountValue: entry.editMetaCount,
    })),
    systemTimeData: entries.map((entry) => ({ 
      name: entry.name, 
      value: entry.systemTimeSeconds,
      firstSpreadValue: entry.firstSpreadSeconds,
      secondSpreadValue: entry.secondSpreadSeconds
    })),
    idleTimeData: entries.map((entry) => ({ 
      name: entry.name, 
      value: entry.idleWaitingSeconds,
      firstSpreadIdleValue: entry.firstSpreadIdleSeconds,
      secondSpreadIdleValue: entry.secondSpreadIdleSeconds,
      avgReviewEditIdleValue: entry.avgReviewEditIdleSeconds,
    })),
  };
}

