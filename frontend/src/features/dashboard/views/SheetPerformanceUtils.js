import { toDrillGroup } from '@/lib/segmentUtils.js';

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
      rowTotal = (row.reviewSeconds || 0) + (row.editDataSeconds || 0) + (row.editMetaSeconds || 0);
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
