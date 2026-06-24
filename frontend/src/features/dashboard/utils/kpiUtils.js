import {
  CORE_WORK_SESSION_TYPES,
  initialKpiData
} from './constants.js';
import { Clock, Users, Timer, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDuration, formatPercent } from './durationFormatters.js';
import { safeNumber } from './numberUtils.js';
import { isDataEditSegmentType, isIdleContextSegment, isMetaEditSegmentType, isProcessingEquivalentIdleSegment } from './segmentUtils.js';

export function buildKpiData(kpis) {
  if (!kpis) return initialKpiData;
  return [
    {
      id: 7,
      label: 'Total time',
      value: kpis.totalLeadTimeDisplay || '-',
      subtext: '',
      icon: Timer,
      color: 'text-[#3860be]',
      bg: 'bg-[#eef3ff]',
    },
    {
      id: 1,
      label: 'User Time',
      value: kpis.activeUserTimeDisplay || '-',
      subtext: '',
      icon: Clock,
      color: 'text-[#00a4e4]',
      bg: 'bg-[#e8f7fd]',
    },
    {
      id: 6,
      label: 'System Time',
      value: kpis.systemTimeDisplay || '-',
      subtext: '',
      icon: Clock,
      color: 'text-[#334155]',
      bg: 'bg-slate-100',
    },
    {
      id: 8,
      label: 'Idle Time',
      value: kpis.idleWaitingDisplay || '-',
      subtext: '',
      icon: Clock,
      color: 'text-[#94A3B8]',
      bg: 'bg-slate-50',
    },
    {
      id: 2,
      label: 'Users',
      value: String(kpis.contributingUsers || 0),
      subtext: '',
      icon: Users,
      color: 'text-[#3860be]',
      bg: 'bg-[#eef3ff]',
    },
  ];
}

export function buildKpisFromSegments(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const userSegments = safeSegments.filter((segment) => String(segment.segmentType || '').startsWith('USER_'));
  const coreUserSegments = userSegments.filter((segment) => CORE_WORK_SESSION_TYPES.has(String(segment.segmentType || '')));
  const idleSegments = safeSegments.filter((segment) => isIdleContextSegment(segment.segmentType));
  const processingEquivalentIdleSegments = safeSegments.filter((segment) => isProcessingEquivalentIdleSegment(segment.segmentType));
  const systemSegments = safeSegments.filter((s) => String(s.segmentType || '').startsWith('SYSTEM_'));

  const effectiveDuration = (segment) => safeNumber(segment?.durationSeconds);

  const activeUserTimeSeconds = coreUserSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const coreActiveUserTimeSeconds = coreUserSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const contributingUsers = new Set(
    userSegments
      .map((segment) => String(segment.userName || ''))
      .filter((userName) => userName && userName.toLowerCase() !== 'system')
  ).size;
  const avgUserSessionSeconds = coreUserSegments.length > 0 ? coreActiveUserTimeSeconds / coreUserSegments.length : 0;

  const uniqueDocuments = new Set(
    safeSegments
      .map((s) => s.documentId || s.fileName)
      .filter(Boolean)
  ).size;

  const idleWaitingSeconds = idleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const idleWaitingOccurrences = idleSegments.length;
  
  const processingEquivalentSystemSeconds = processingEquivalentIdleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const coreSystemSeconds = systemSegments.reduce((sum, s) => sum + safeNumber(s.durationSeconds), 0);
  const systemTimeSeconds = coreSystemSeconds + processingEquivalentSystemSeconds;

  const avgSystemTimePerDoc = uniqueDocuments > 0 ? systemTimeSeconds / uniqueDocuments : 0;

  const totalActiveSeconds = activeUserTimeSeconds + systemTimeSeconds;
  const systemPercentOfActive = totalActiveSeconds > 0 ? (systemTimeSeconds / totalActiveSeconds) : 0;

  const editTimeSeconds = coreUserSegments
    .filter((segment) => {
      const type = String(segment.segmentType || '');
      return isDataEditSegmentType(type) || isMetaEditSegmentType(type);
    })
    .reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const reworkRate = activeUserTimeSeconds > 0 ? (editTimeSeconds / activeUserTimeSeconds) : 0;

  const totalCycleSeconds = activeUserTimeSeconds + idleWaitingSeconds + systemTimeSeconds;
  const idlePercentOfCycle = totalCycleSeconds > 0 ? (idleWaitingSeconds / totalCycleSeconds) * 100 : 0;
  const systemPercentOfCycle = totalCycleSeconds > 0 ? (systemTimeSeconds / totalCycleSeconds) * 100 : 0;
  const avgTimePerUser = contributingUsers > 0 ? activeUserTimeSeconds / contributingUsers : 0;

  const userTimeMap = {};
  for (const seg of userSegments) {
    const name = String(seg.userName || '').trim();
    if (name && name.toLowerCase() !== 'system') {
      userTimeMap[name] = (userTimeMap[name] || 0) + effectiveDuration(seg);
    }
  }
  const topContributor = Object.entries(userTimeMap).sort((a, b) => b[1] - a[1])[0];

  const sessionDurations = coreUserSegments.map((s) => effectiveDuration(s)).sort((a, b) => a - b);
  const medianSessionSeconds = sessionDurations.length > 0
    ? sessionDurations[Math.floor(sessionDurations.length / 2)]
    : 0;
  const minSessionSeconds = sessionDurations.length > 0 ? sessionDurations[0] : 0;
  const maxSessionSeconds = sessionDurations.length > 0 ? sessionDurations[sessionDurations.length - 1] : 0;

  const totalSessions = coreUserSegments.length;

  const reworkSessions = coreUserSegments.filter((segment) => {
    const type = String(segment.segmentType || '');
    return isDataEditSegmentType(type) || isMetaEditSegmentType(type);
  }).length;

  const segmentsBySheet = new Map();
  safeSegments.forEach(s => {
    if (!s.sheetKey) return;
    if (!segmentsBySheet.has(s.sheetKey)) segmentsBySheet.set(s.sheetKey, []);
    segmentsBySheet.get(s.sheetKey).push(s);
  });

  let totalLeadTimeSeconds = 0;
  segmentsBySheet.forEach(sheetSegments => {
    const minStart = Math.min(...sheetSegments.map(s => s.startTs));
    const maxEnd = Math.max(...sheetSegments.map(s => s.endTs));
    totalLeadTimeSeconds += (maxEnd - minStart) / 1000;
  });

  return {
    activeUserTimeSeconds,
    activeUserTimeDisplay: formatDuration(activeUserTimeSeconds),
    contributingUsers,
    uniqueDocuments,
    avgUserSessionSeconds,
    avgUserSessionDisplay: formatDuration(avgUserSessionSeconds),
    idleWaitingSeconds,
    idleWaitingDisplay: formatDuration(idleWaitingSeconds),
    idleWaitingOccurrences,
    reworkRate,
    reworkRateDisplay: formatPercent(reworkRate),
    systemTimeSeconds,
    systemTimeDisplay: formatDuration(systemTimeSeconds),
    avgSystemTimePerDoc,
    avgSystemTimePerDocDisplay: formatDuration(avgSystemTimePerDoc),
    systemPercentOfActive,
    systemPercentOfCycle,
    avgTimePerUser,
    avgTimePerUserDisplay: formatDuration(avgTimePerUser),
    idlePercentOfCycle,
    topContributorName: topContributor ? topContributor[0] : '',
    topContributorTime: topContributor ? topContributor[1] : 0,
    topContributorDisplay: topContributor ? formatDuration(topContributor[1]) : '',
    medianSessionSeconds,
    medianSessionDisplay: formatDuration(medianSessionSeconds),
    minSessionDisplay: formatDuration(minSessionSeconds),
    maxSessionDisplay: formatDuration(maxSessionSeconds),
    reworkSessions,
    editTimeSeconds,
    totalSessions,
    totalLeadTimeSeconds,
    totalLeadTimeDisplay: formatDuration(totalLeadTimeSeconds),
  };
}
