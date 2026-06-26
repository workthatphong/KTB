// @ts-nocheck
import { toDrillGroup } from '@/features/dashboard/utils/segmentUtils';

export function getCognizeVsOthersData(rows, timeCategory = 'all') {
  if (!rows || rows.length === 0) return { cognizeSeconds: 0, othersSeconds: 0, totalSeconds: 0 };
  let cognizeSeconds = 0;
  let othersSeconds = 0;

  for (const row of rows) {
    if (row.user.toLowerCase() === 'system' || row.user.toLowerCase() === 'idle') continue;
    
    let rowTotal = 0;
    if (timeCategory === 'editData') {
      rowTotal = (row.editDataSeconds || 0);
    } else if (timeCategory === 'editDataRecord') {
      rowTotal = (row.editDataCount || 0);
    } else if (timeCategory === 'review') {
      rowTotal = (row.reviewSeconds || 0);
    } else if (timeCategory === 'reviewRecord') {
      rowTotal = (row.reviewCount || 0);
    } else if (timeCategory === 'completeTime') {
      rowTotal = (row.totalSeconds || 0);
    } else {
      rowTotal = (row.reviewSeconds || 0) + (row.editDataSeconds || 0);
    }

    if (row.user.toLowerCase().includes('cognize')) {
      cognizeSeconds += rowTotal;
    } else {
      othersSeconds += rowTotal;
    }
  }

  return { 
    cognizeSeconds, 
    othersSeconds, 
    totalSeconds: cognizeSeconds + othersSeconds 
  };
}

export function buildPageTimeData(segments, timeCategory = 'all', userSortOrder = 'default', userRoleFilter = 'all', mergeSameName = false) {
  if (!segments || segments.length === 0) return { userData: [] };
  const pageStats = new Map();
  
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    
    const origUser = String(segment.userName || '').trim();
    const user = origUser.toLowerCase();
    if (user === 'system' || user === 'idle') continue;
    
    const isCognize = user.includes('cognize');
    
    if (userRoleFilter === 'maker_only' && isCognize) continue;
    if (userRoleFilter === 'cognize_only' && !isCognize) continue;
    if (userRoleFilter !== 'all' && userRoleFilter !== 'maker_only' && userRoleFilter !== 'cognize_only' && origUser !== userRoleFilter) continue;
    
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const name = sheetName || fileName;
    let sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) continue;
    
    if (mergeSameName) {
      sheetKey = name;
    }
    
    if (!pageStats.has(sheetKey)) {
      pageStats.set(sheetKey, { 
        name: name, 
        userFiltered: 0, 
        cognizeFiltered: 0, 
        makerFiltered: 0,
        startTs: Number.MAX_SAFE_INTEGER,
        endTs: 0
      });
    }
    
    const stat = pageStats.get(sheetKey);
    const duration = Number(segment.durationSeconds) || 0;
    
    const getTs = (val1, val2, val3) => {
      const val = val1 ?? val2 ?? val3;
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const num = Number(val);
      if (!isNaN(num)) return num;
      return Date.parse(val) || 0;
    };
    const sTs = getTs(segment.startTs, segment.start, segment.startTime);
    const eTs = getTs(segment.endTs, segment.end, segment.endTime);
    if (sTs && sTs < stat.startTs) stat.startTs = sTs;
    if (eTs && eTs > stat.endTs) stat.endTs = eTs;

    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (timeCategory === 'all' && drillGroup !== 'Review' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (timeCategory === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'reviewRecord' && drillGroup !== 'Review') matchesCategory = false;

    if (matchesCategory) {
      let increment = duration;
      if (timeCategory === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (timeCategory === 'reviewRecord') {
        increment = 1;
      }
      stat.userFiltered += increment;
      if (isCognize) {
        stat.cognizeFiltered += increment;
      } else {
        stat.makerFiltered += increment;
      }
    }
  }

  const allStats = Array.from(pageStats.values());
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const sortedUser = [...allStats].sort((a, b) => {
    if (userSortOrder === 'desc') {
      const diff = b.userFiltered - a.userFiltered;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'asc') {
      const diff = a.userFiltered - b.userFiltered;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'oldest') {
      const diff = a.startTs - b.startTs;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'latest') {
      const diff = b.startTs - a.startTs;
      if (diff !== 0) return diff;
    }
    return collator.compare(a.name, b.name);
  });

  return {
    userData: sortedUser.map(s => ({ name: s.name, value: s.userFiltered, cognizeValue: s.cognizeFiltered, makerValue: s.makerFiltered, startTs: s.startTs, endTs: s.endTs })),
  };
}

export const buildUserTimeData = (segments, timeCategory = 'all', userSortOrder = 'default', userRoleFilter = 'all', isAveragePerSheet = false) => {
  if (!segments) return { userData: [] };
  
  const userStats = new Map();
  
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    
    const origUser = String(segment.userName || '').trim();
    const user = origUser.toLowerCase();
    if (user === 'system' || user === 'idle') continue;
    
    const isCognize = user.includes('cognize');
    
    if (userRoleFilter === 'maker_only' && isCognize) continue;
    if (userRoleFilter === 'cognize_only' && !isCognize) continue;
    if (userRoleFilter !== 'all' && userRoleFilter !== 'maker_only' && userRoleFilter !== 'cognize_only' && origUser !== userRoleFilter) continue;
    
    const userNameKey = origUser;
    if (!userNameKey) continue;
    
    if (!userStats.has(userNameKey)) {
      userStats.set(userNameKey, { 
        name: userNameKey, 
        userFiltered: 0, 
        cognizeFiltered: 0, 
        makerFiltered: 0,
        startTs: Number.MAX_SAFE_INTEGER,
        endTs: 0,
        sheets: new Set()
      });
    }
    
    const stat = userStats.get(userNameKey);
    const sheetKey = `${segment.fileName || segment.documentName || 'unknown'}|${segment.pageName || segment.sheetName || 'unknown'}`;
    stat.sheets.add(sheetKey);
    const duration = Number(segment.durationSeconds) || 0;
    
    const getTs = (val1, val2, val3) => {
      const val = val1 ?? val2 ?? val3;
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const num = Number(val);
      if (!isNaN(num)) return num;
      return Date.parse(val) || 0;
    };
    const sTs = getTs(segment.startTs, segment.start, segment.startTime);
    const eTs = getTs(segment.endTs, segment.end, segment.endTime);
    if (sTs && sTs < stat.startTs) stat.startTs = sTs;
    if (eTs && eTs > stat.endTs) stat.endTs = eTs;

    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (timeCategory === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (timeCategory === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'reviewRecord' && drillGroup !== 'Review') matchesCategory = false;

    if (matchesCategory) {
      let increment = duration;
      if (timeCategory === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (timeCategory === 'reviewRecord') {
        increment = 1;
      }
      stat.userFiltered += increment;
      if (isCognize) {
        stat.cognizeFiltered += increment;
      } else {
        stat.makerFiltered += increment;
      }
    }
  }

  const allStats = Array.from(userStats.values()).map(stat => {
    let multiplier = 1;
    if (isAveragePerSheet && stat.sheets.size > 0) {
      multiplier = 1 / stat.sheets.size;
    }
    return {
      ...stat,
      userFiltered: stat.userFiltered * multiplier,
      cognizeFiltered: stat.cognizeFiltered * multiplier,
      makerFiltered: stat.makerFiltered * multiplier
    };
  });
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const sortedUser = [...allStats].sort((a, b) => {
    if (userSortOrder === 'desc') {
      const diff = b.userFiltered - a.userFiltered;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'asc') {
      const diff = a.userFiltered - b.userFiltered;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'oldest') {
      const diff = a.startTs - b.startTs;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'latest') {
      const diff = b.startTs - a.startTs;
      if (diff !== 0) return diff;
    }
    return collator.compare(a.name, b.name);
  });

  return {
    userData: sortedUser.map(s => ({ name: s.name, value: s.userFiltered, cognizeValue: s.cognizeFiltered, makerValue: s.makerFiltered, startTs: s.startTs, endTs: s.endTs })),
  };
}

const getSharedTs = (seg: any) => {
  const val = seg.endTs ?? seg.end ?? seg.endTime ?? seg.timestamp;
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const num = Number(val);
  if (!isNaN(num)) return num;
  return Date.parse(val) || 0;
};

const getSharedStartTs = (seg: any) => {
  let val = seg.startTs ?? seg.start ?? seg.startTime;
  if (val) {
    if (typeof val === 'number') return val;
    const num = Number(val);
    if (!isNaN(num)) return num;
    return Date.parse(val) || 0;
  }
  const end = getSharedTs(seg);
  const durationMs = (Number(seg.durationSeconds) || 0) * 1000;
  if (end > 0 && durationMs > 0) return end - durationMs;
  return end;
};

export function buildSpreadCompletionTimeData(segments: any[], systemTaskType = 'all') {
  if (!segments || segments.length === 0) return { userData: [] };
  const sheetStats = new Map<string, { name: string, end1: number, end2: number, filteredValue: number, idleValue: number, reviewValue: number, editValue: number }>();
  
  const getTs = getSharedTs;
  const getStartTs = getSharedStartTs;

  for (const segment of segments) {
    const type = String(segment.segmentType || '');
    const isSpread1 = type === 'SYSTEM_INITIAL_PROCESSING';
    const isSpread2 = type === 'SYSTEM_SCHEDULED_REPROCESSING' || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2';
    
    if (!isSpread1 && !isSpread2) continue;
    
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const name = sheetName || fileName;
    const sheetKey = sheetName || 'Document';
    const displayName = sheetName || 'Document';
    
    if (!sheetKey) continue;
    
    if (!sheetStats.has(sheetKey)) {
      sheetStats.set(sheetKey, { name: displayName, end1: 0, end2: 0, filteredValue: 0, idleValue: 0, reviewValue: 0, editValue: 0 });
    }
    
    const stat = sheetStats.get(sheetKey)!;
    const ts = getTs(segment);
    
    if (ts > 0) {
      if (isSpread1 && ts > stat.end1) stat.end1 = ts;
      if (isSpread2 && ts > stat.end2) stat.end2 = ts;
    }
  }

  // Pass 2: Calculate filteredValue for task types
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    const origUser = String(segment.userName || '').trim();
    const user = origUser.toLowerCase();
    if (user === 'system' || user === 'idle') continue;

    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (systemTaskType === 'all' && drillGroup !== 'Review' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (systemTaskType === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'reviewRecord' && drillGroup !== 'Review') matchesCategory = false;

    if (!matchesCategory) continue;

    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    
    const stat = sheetStats.get(sheetKey);
    if (!stat || stat.end1 === 0 || stat.end2 === 0) continue;

    const segStart = getStartTs(segment);
    const segEnd = getTs(segment);
    if (segStart === 0 || segEnd === 0) continue;

    const minEnd = Math.min(stat.end1, stat.end2);
    const maxEnd = Math.max(stat.end1, stat.end2);

    const overlapStart = Math.max(segStart, minEnd);
    const overlapEnd = Math.min(segEnd, maxEnd);

    if (overlapStart < overlapEnd) {
      let increment = 0;
      if (systemTaskType === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (systemTaskType === 'reviewRecord') {
        increment = 1;
      } else {
        increment = (overlapEnd - overlapStart) / 1000;
      }
      stat.filteredValue += increment;
      if (drillGroup === 'Review') stat.reviewValue += increment;
      if (drillGroup === 'EditData') stat.editValue += increment;
    } else if (segStart === segEnd && segStart >= minEnd && segStart <= maxEnd) {
      let increment = 0;
      if (systemTaskType === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (systemTaskType === 'reviewRecord') {
        increment = 1;
      } else {
        increment = Number(segment.durationSeconds) || 0;
      }
      stat.filteredValue += increment;
      if (drillGroup === 'Review') stat.reviewValue += increment;
      if (drillGroup === 'EditData') stat.editValue += increment;
    }
  }

  // Pass 3: Calculate idleValue
  for (const segment of segments) {
    const type = String(segment.segmentType || '');
    const isIdle = (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE') 
      && type !== 'IDLE_WAITING_FOR_SCHEDULED_REPROCESS';
    
    if (!isIdle) continue;

    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    
    const stat = sheetStats.get(sheetKey);
    if (!stat || stat.end1 === 0 || stat.end2 === 0) continue;

    const segStart = getStartTs(segment);
    const segEnd = getTs(segment);
    if (segStart === 0 || segEnd === 0) continue;

    const minEnd = Math.min(stat.end1, stat.end2);
    const maxEnd = Math.max(stat.end1, stat.end2);

    const overlapStart = Math.max(segStart, minEnd);
    const overlapEnd = Math.min(segEnd, maxEnd);

    if (overlapStart < overlapEnd) {
      stat.idleValue += (overlapEnd - overlapStart) / 1000;
    }
  }

  const result: any[] = [];
  for (const stat of sheetStats.values()) {
    if (stat.end1 > 0 && stat.end2 > 0) {
      const diffMs = Math.abs(stat.end2 - stat.end1);
      result.push({
        name: stat.name,
        value: diffMs / 1000,
        filteredValue: stat.filteredValue,
        idleValue: stat.idleValue,
        reviewValue: stat.reviewValue,
        editValue: stat.editValue
      });
    }
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  result.sort((a, b) => collator.compare(a.name, b.name));

  return { userData: result };
}

export function buildSpread2ToFinalActionData(segments: any[], systemTaskType: string) {
  if (!segments || segments.length === 0) return { userData: [] };

  const getTs = getSharedTs;
  const getStartTs = getSharedStartTs;

  const sheetStats = new Map<string, {
    name: string,
    end2: number,
    finalTs: number,
    filteredValue: number,
    idleValue: number,
    reviewValue: number,
    editValue: number
  }>();

  // Pass 1: Find Spread 2 end timestamp and final action timestamp for each sheet
  for (const segment of segments) {
    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    if (!sheetKey) continue;
    
    const isSpread2 = segment.segmentType === 'SYSTEM_SCHEDULED_REPROCESSING';
    const isSpread1 = segment.segmentType === 'SYSTEM_INITIAL_PROCESSING';

    const displayName = (sheetName && sheetName !== 'Document') ? sheetName : 'Document';
    
    if (!sheetStats.has(sheetKey)) {
      sheetStats.set(sheetKey, { name: displayName, end2: 0, finalTs: 0, filteredValue: 0, idleValue: 0, reviewValue: 0, editValue: 0 });
    }
    
    const stat = sheetStats.get(sheetKey)!;
    const ts = getTs(segment);
    
    if (ts > 0) {
      // Find Spread 2 timestamp
      if ((isSpread1 || isSpread2 || segment.segmentType === 'SYSTEM_PROCESSING') && segment.pageGroup === 'Sheet 2') {
        if (ts > stat.end2) stat.end2 = ts;
      } else if (isSpread2 && !segment.pageGroup) { // Fallback if Spread 2 has no pageGroup
        if (ts > stat.end2) stat.end2 = ts;
      }
      
      // Track final action timestamp
      if (ts > stat.finalTs) stat.finalTs = ts;
    }
  }

  // Pass 2: Calculate filteredValue for task types between end2 and finalTs
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    const origUser = String(segment.userName || '').trim();
    const user = origUser.toLowerCase();
    if (user === 'system' || user === 'idle') continue;

    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (systemTaskType === 'all' && drillGroup !== 'Review' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (systemTaskType === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'reviewRecord' && drillGroup !== 'Review') matchesCategory = false;

    if (!matchesCategory) continue;

    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    
    const stat = sheetStats.get(sheetKey);
    if (!stat || stat.end2 === 0 || stat.finalTs === 0) continue;

    const segStart = getStartTs(segment);
    const segEnd = getTs(segment);
    if (segStart === 0 || segEnd === 0) continue;

    const minEnd = Math.min(stat.end2, stat.finalTs);
    const maxEnd = Math.max(stat.end2, stat.finalTs);

    const overlapStart = Math.max(segStart, minEnd);
    const overlapEnd = Math.min(segEnd, maxEnd);

    if (overlapStart < overlapEnd) {
      let increment = 0;
      if (systemTaskType === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (systemTaskType === 'reviewRecord') {
        increment = 1;
      } else {
        increment = (overlapEnd - overlapStart) / 1000;
      }
      stat.filteredValue += increment;
      if (drillGroup === 'Review') stat.reviewValue += increment;
      if (drillGroup === 'EditData') stat.editValue += increment;
    } else if (segStart === segEnd && segStart >= minEnd && segStart <= maxEnd) {
      let increment = 0;
      if (systemTaskType === 'editDataRecord') {
        increment = Number(segment.editDataItemCount) || 1;
      } else if (systemTaskType === 'reviewRecord') {
        increment = 1;
      } else {
        increment = Number(segment.durationSeconds) || 0;
      }
      stat.filteredValue += increment;
      if (drillGroup === 'Review') stat.reviewValue += increment;
      if (drillGroup === 'EditData') stat.editValue += increment;
    }
  }

  // Pass 3: Calculate idleValue between end2 and finalTs
  for (const segment of segments) {
    const type = String(segment.segmentType || '');
    const isIdle = (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE') 
      && type !== 'IDLE_WAITING_FOR_SCHEDULED_REPROCESS';
    
    if (!isIdle) continue;

    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    
    const stat = sheetStats.get(sheetKey);
    if (!stat || stat.end2 === 0 || stat.finalTs === 0) continue;

    const segStart = getStartTs(segment);
    const segEnd = getTs(segment);
    if (segStart === 0 || segEnd === 0) continue;

    const minEnd = Math.min(stat.end2, stat.finalTs);
    const maxEnd = Math.max(stat.end2, stat.finalTs);

    const overlapStart = Math.max(segStart, minEnd);
    const overlapEnd = Math.min(segEnd, maxEnd);

    if (overlapStart < overlapEnd) {
      stat.idleValue += (overlapEnd - overlapStart) / 1000;
    }
  }

  const result: any[] = [];
  for (const stat of sheetStats.values()) {
    if (stat.end2 > 0 && stat.finalTs > stat.end2) {
      const diffMs = Math.abs(stat.finalTs - stat.end2);
      result.push({
        name: stat.name,
        value: diffMs / 1000,
        filteredValue: stat.filteredValue,
        idleValue: stat.idleValue,
        reviewValue: stat.reviewValue,
        editValue: stat.editValue
      });
    }
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  result.sort((a, b) => collator.compare(a.name, b.name));

  return { userData: result };
}

export function buildAllTimeData(segments: any[], systemTaskType = 'all') {
  if (!segments || segments.length === 0) return { userData: [] };

  const getTs = getSharedTs;
  const getStartTs = getSharedStartTs;
  const sheetStats = new Map<string, { name: string, startTs: number, endTs: number, filteredValue: number, idleValue: number, reviewValue: number, editValue: number }>();

  for (const segment of segments) {
    const sheetName = String(segment.pageName || segment.sheetName || '').trim();
    const sheetKey = sheetName || 'Document';
    if (!sheetKey) continue;

    const displayName = (sheetName && sheetName !== 'Document') ? sheetName : 'Document';

    if (!sheetStats.has(sheetKey)) {
      sheetStats.set(sheetKey, { name: displayName, startTs: Number.POSITIVE_INFINITY, endTs: 0, filteredValue: 0, idleValue: 0, reviewValue: 0, editValue: 0 });
    }

    const stat = sheetStats.get(sheetKey)!;
    const segStart = getStartTs(segment);
    const segEnd = getTs(segment);

    if (segStart > 0 && segStart < stat.startTs) stat.startTs = segStart;
    if (segEnd > 0 && segEnd > stat.endTs) stat.endTs = segEnd;

    const type = String(segment.segmentType || '');
    const isIdle = (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE')
      && type !== 'IDLE_WAITING_FOR_SCHEDULED_REPROCESS';
    if (isIdle && segStart > 0 && segEnd > 0 && segEnd > segStart) {
      stat.idleValue += (segEnd - segStart) / 1000;
    }

    if (!type.startsWith('USER_')) continue;

    const origUser = String(segment.userName || '').trim();
    const user = origUser.toLowerCase();
    if (user === 'system' || user === 'idle') continue;

    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (systemTaskType === 'all' && drillGroup !== 'Review' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (systemTaskType === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;
    if (systemTaskType === 'reviewRecord' && drillGroup !== 'Review') matchesCategory = false;

    if (!matchesCategory) continue;

    const segDuration = Number(segment.durationSeconds) || 0;
    if (segDuration <= 0) continue;

    stat.filteredValue += systemTaskType === 'editDataRecord'
      ? (Number(segment.editDataItemCount) || 1)
      : systemTaskType === 'reviewRecord'
        ? 1
        : segDuration;

    if (drillGroup === 'Review') stat.reviewValue += systemTaskType === 'reviewRecord' ? 1 : segDuration;
    if (drillGroup === 'EditData') stat.editValue += systemTaskType === 'editDataRecord' ? (Number(segment.editDataItemCount) || 1) : segDuration;
  }

  const result: any[] = [];
  for (const stat of sheetStats.values()) {
    if (!Number.isFinite(stat.startTs) || stat.startTs === Number.POSITIVE_INFINITY) continue;
    if (stat.endTs <= 0 || stat.endTs < stat.startTs) continue;
    result.push({
      name: stat.name,
      value: (stat.endTs - stat.startTs) / 1000,
      startTs: stat.startTs,
      endTs: stat.endTs,
      filteredValue: stat.filteredValue,
      idleValue: stat.idleValue,
      reviewValue: stat.reviewValue,
      editValue: stat.editValue,
    });
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  result.sort((a, b) => collator.compare(a.name, b.name));

  return { userData: result };
}
