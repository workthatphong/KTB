import { useMemo } from 'react';
import { buildUserTimeData } from '../../SheetPerformanceUtils.js';

export function useTimePerUserData({
  firstSegments,
  secondSegments,
  systemTaskType,
  userSortOrder,
  userRoleFilter,
  isTotalView,
  isGroupedView,
  alignUsers,
  showDiffChart,
  systemDocumentsSwapped
}) {
  const firstUserTimesRaw = useMemo(() => buildUserTimeData(firstSegments, systemTaskType, userSortOrder, userRoleFilter, !isTotalView), [firstSegments, systemTaskType, userSortOrder, userRoleFilter, isTotalView]);
  const secondUserTimesRaw = useMemo(() => buildUserTimeData(secondSegments, systemTaskType, userSortOrder, userRoleFilter, !isTotalView), [secondSegments, systemTaskType, userSortOrder, userRoleFilter, isTotalView]);

  const groupedUserTimes = useMemo(() => {
    if (!isGroupedView) return { userData: [] };
    const allSegments = [...(firstSegments || []), ...(secondSegments || [])];
    return buildUserTimeData(allSegments, systemTaskType, userSortOrder, userRoleFilter, !isTotalView);
  }, [isGroupedView, firstSegments, secondSegments, systemTaskType, userSortOrder, userRoleFilter, isTotalView]);

  const { alignedFirstUserTimes, alignedSecondUserTimes } = useMemo(() => {
    if (!alignUsers && !showDiffChart) return { alignedFirstUserTimes: firstUserTimesRaw, alignedSecondUserTimes: secondUserTimesRaw };
    
    const userMap = new Map();
    firstUserTimesRaw.userData.forEach(u => {
      if (!userMap.has(u.name)) userMap.set(u.name, { first: u, second: null });
      else userMap.get(u.name).first = u;
    });
    secondUserTimesRaw.userData.forEach(u => {
      if (!userMap.has(u.name)) userMap.set(u.name, { first: null, second: u });
      else userMap.get(u.name).second = u;
    });

    const allUsers = Array.from(userMap.values());
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    
    allUsers.sort((a, b) => {
      const aVal1 = a.first?.value || 0;
      const aVal2 = a.second?.value || 0;
      const bVal1 = b.first?.value || 0;
      const bVal2 = b.second?.value || 0;
      
      const aStart1 = a.first?.startTs || Number.MAX_SAFE_INTEGER;
      const aStart2 = a.second?.startTs || Number.MAX_SAFE_INTEGER;
      const bStart1 = b.first?.startTs || Number.MAX_SAFE_INTEGER;
      const bStart2 = b.second?.startTs || Number.MAX_SAFE_INTEGER;

      const aEnd1 = a.first?.endTs || 0;
      const aEnd2 = a.second?.endTs || 0;
      const bEnd1 = b.first?.endTs || 0;
      const bEnd2 = b.second?.endTs || 0;

      if (userSortOrder === 'desc') {
        const diff = (bVal1 + bVal2) - (aVal1 + aVal2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder === 'asc') {
        const diff = (aVal1 + aVal2) - (bVal1 + bVal2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder === 'oldest') {
        const diff = Math.min(aStart1, aStart2) - Math.min(bStart1, bStart2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder === 'latest') {
        const diff = Math.max(bEnd1, bEnd2) - Math.max(aEnd1, aEnd2);
        if (diff !== 0) return diff;
      }
      
      const aName = a.first?.name || a.second?.name || '';
      const bName = b.first?.name || b.second?.name || '';
      return collator.compare(aName, bName);
    });

    const newFirst = allUsers.map(u => u.first || { name: u.second?.name || u.first?.name, value: 0, cognizeValue: 0, makerValue: 0 });
    const newSecond = allUsers.map(u => u.second || { name: u.first?.name || u.second?.name, value: 0, cognizeValue: 0, makerValue: 0 });

    return { 
      alignedFirstUserTimes: { userData: newFirst }, 
      alignedSecondUserTimes: { userData: newSecond } 
    };
  }, [alignUsers, firstUserTimesRaw, secondUserTimesRaw, userSortOrder, showDiffChart]);

  const diffUserData = useMemo(() => {
    if (!showDiffChart) return [];
    
    return alignedFirstUserTimes.userData.map((u, i) => {
      const v1 = u.value;
      const v2 = alignedSecondUserTimes.userData[i]?.value || 0;
      const diffRaw = v2 - v1; 
      const logicalDiff = systemDocumentsSwapped ? -diffRaw : diffRaw;
      
      let fill = '#94a3b8';
      if (logicalDiff > 0) fill = '#ef4444';
      if (logicalDiff < 0) fill = '#22c55e';
      
      return {
        ...u,
        value: diffRaw,
        logicalDiff: logicalDiff,
        fill
      };
    });
  }, [alignedFirstUserTimes, alignedSecondUserTimes, showDiffChart, systemDocumentsSwapped]);

  return {
    groupedUserTimes,
    firstUserTimes: alignedFirstUserTimes,
    secondUserTimes: alignedSecondUserTimes,
    diffUserData
  };
}
