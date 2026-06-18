import React, { Suspense, lazy } from 'react';
import { ChevronDown, Clock, User, X } from 'lucide-react';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { buildAverageTransitionTimeData, buildTransitionBreakdownGroups } from '../utils/transitionMetrics.js';
import {
  isIdleContextSegment,
  isProcessingEquivalentIdleSegment,
  mergeContinuousReprocessingSegments,
  toDrillGroup,
  toGanttSegmentTypeLabel,
  toTimelineLane
} from '../../../lib/segmentUtils.js';
import {
  formatDuration,
  toDisplayDate,
} from '../../../lib/utils.js';
import { mapSegmentsToRows } from '../../timeline/timelineUtils.js';
import { toSegmentGroup } from '../utils/segmentData.js';
import { buildSheetPerformanceChartsData, getTotalTimeChartAppearance, getUserTimeChartAppearance, selectUserTimeChartData, sortSheetPerformanceChartData } from '../utils/sheetPerformanceCharts.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';

const ganttTimelineChartPromise = import('../../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart }));
const donutWorkloadChartPromise = import('../../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart }));
const userContributionStackChartPromise = import('../../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart }));
const processTimeBreakdownChartPromise = import('../../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart }));
const sheetProcessMatrixPromise = import('./SheetProcessMatrix.jsx').then((module) => ({ default: module.SheetProcessMatrix }));

const GanttTimelineChart = lazy(() => ganttTimelineChartPromise);
const DonutWorkloadChart = lazy(() => donutWorkloadChartPromise);
const UserContributionStackChart = lazy(() => userContributionStackChartPromise);
const ProcessTimeBreakdownChart = lazy(() => processTimeBreakdownChartPromise);
const SheetProcessMatrix = lazy(() => sheetProcessMatrixPromise);

function ExpandedChartFallback() {
  return <div className="min-h-[420px] w-full rounded-[2rem] bg-slate-100 animate-pulse" />;
}

function buildChartAnimationKey(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) return 'empty';
  return rows.map((row, index) => {
    const rowId = row.id || row.key || row.label || row.name || row.user || `row-${index}`;
    const values = fields.map((field) => String(row?.[field] ?? ''));
    return `${rowId}:${values.join(':')}`;
  }).join('|');
}

const POINT_IN_TIME_SEGMENT_TYPES = new Set([
  'AUTO_TIMEOUT_MARKER',
  'COMPLETE_BY_REVIEW_MARKER',
  'COMPLETE_BY_EDIT_MARKER',
  'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER',
  'REOPEN_MARKER',
  'REOPEN_TO_REVIEW_HANDOFF_MARKER',
]);

function isTimelineDurationSegment(segment) {
  const segmentType = String(segment?.segmentType || '');
  if (POINT_IN_TIME_SEGMENT_TYPES.has(segmentType)) return false;

  const rawStartTs = Date.parse(String(segment?.start || ''));
  const rawEndTs = Date.parse(String(segment?.end || ''));
  if (Number.isFinite(rawStartTs) && Number.isFinite(rawEndTs)) return rawEndTs > rawStartTs;

  const startTs = Number(segment?.startTs);
  const endTs = Number(segment?.endTs);
  return Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs;
}

function toTimelineDetailCountKey(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Uploading') return 'Uploading';
  if (drillGroup === 'Processing') return 'Processing';
  if (drillGroup === 'Reprocessing') return 'Reprocessing';
  if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return 'Review';
  if (drillGroup === 'EditData') return 'EditData';
  if (drillGroup === 'EditMeta') return 'EditMeta';
  if (drillGroup === 'Idle') return 'Idle';
  return '';
}

function toTimelineBarLabel(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Processing') return 'First Spread';
  if (drillGroup === 'Reprocessing') return 'Second Spread';
  return toGanttSegmentTypeLabel(segmentType);
}

function shouldExcludeDetailActivity(activityLabel, documentLabel) {
  const haystack = `${String(activityLabel || '')} ${String(documentLabel || '')}`.toLowerCase();
  return haystack.includes('markup')
    || haystack.includes('markdown')
    || haystack.includes('mark down')
    || haystack.includes('timestamp')
    || haystack.includes('time stamp')
    || haystack.includes('time stam');
}

function buildTimelineDetailData(segments, timelineSettings) {
  const singleLane = Boolean(timelineSettings?.singleLane);
  const showSystemLane = timelineSettings?.showSystemLane !== false;
  const showIdleLane = timelineSettings?.showIdleLane !== false;

  const mappedRows = mapSegmentsToRows(
    Array.isArray(segments) ? segments : [],
    singleLane
  ).filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return isTimelineDurationSegment(segment);
  });

  const rawBars = mappedRows
    .map((segment, index) => {
      const countKey = toTimelineDetailCountKey(segment.segmentType);
      return {
        id: segment.id || `timeline-bar-${index}`,
        countKey,
        lane: segment.lane || toTimelineLane(segment.segmentType, segment.userName),
        userName: segment.userName || 'System',
        activity: toTimelineBarLabel(segment.segmentType),
        segmentType: String(segment.segmentType || 'UNKNOWN'),
        start: segment.start,
        end: segment.end,
        startTs: Number(segment.startTs) || Date.parse(String(segment.start || '')) || 0,
        endTs: Number(segment.endTs) || Date.parse(String(segment.end || '')) || 0,
        durationSeconds: Number(segment.durationSeconds) || 0,
        documentLabel: segment.documentLabel || (segment.pageName ? `${segment.fileName || 'Unknown File'} / ${segment.pageName}` : (segment.fileName || 'Unknown File')),
      };
    })
    .filter((bar) => !shouldExcludeDetailActivity(bar.activity, bar.documentLabel))
    .sort((a, b) => a.startTs - b.startTs);

  const barsByLane = new Map();
  rawBars.forEach((bar) => {
    if (!barsByLane.has(bar.lane)) barsByLane.set(bar.lane, []);
    barsByLane.get(bar.lane).push(bar);
  });

  const bars = Array.from(barsByLane.values())
    .flatMap((laneBars) => mergeContinuousReprocessingSegments(laneBars))
    .map((bar) => ({
      ...bar,
      countKey: toTimelineDetailCountKey(bar.segmentType),
      activity: toTimelineBarLabel(bar.segmentType),
    }))
    .sort((a, b) => a.startTs - b.startTs);

  const summaryCounts = {
    Uploading: 0,
    Processing: 0,
    Reprocessing: 0,
    Review: 0,
    EditData: 0,
    EditMeta: 0,
    Idle: 0,
  };
  bars.forEach((bar) => {
    if (bar.countKey) summaryCounts[bar.countKey] += 1;
  });

  const sourceMap = new Map();

  bars.forEach((bar) => {
    const sourceKey = bar.activity;
    if (!sourceMap.has(sourceKey)) {
      sourceMap.set(sourceKey, {
        key: sourceKey,
        activity: bar.activity,
        segmentTypes: new Set(),
        count: 0,
        totalSeconds: 0,
      });
    }
    const source = sourceMap.get(sourceKey);
    source.segmentTypes.add(bar.segmentType);
    source.count += 1;
    source.totalSeconds += bar.durationSeconds;
  });

  return {
    bars,
    summaryCards: [
      { key: 'Uploading', label: 'Uploading', count: summaryCounts.Uploading, accentClass: 'text-[#6d28d9]' },
      { key: 'Processing', label: 'First Spread', count: summaryCounts.Processing, accentClass: 'text-[#0f172a]' },
      { key: 'Reprocessing', label: 'Second Spread', count: summaryCounts.Reprocessing, accentClass: 'text-[#3730a3]' },
      { key: 'Review', label: 'Review', count: summaryCounts.Review, accentClass: 'text-[#0f766e]' },
      { key: 'EditData', label: 'Edit Data', count: summaryCounts.EditData, accentClass: 'text-[#9a3412]' },
      { key: 'EditMeta', label: 'Edit Meta', count: summaryCounts.EditMeta, accentClass: 'text-[#7c2d12]' },
      { key: 'Idle', label: 'Idle', count: summaryCounts.Idle, accentClass: 'text-slate-500' },
    ],
    sourceRows: Array.from(sourceMap.values())
      .map((row) => ({
        ...row,
        segmentType: Array.from(row.segmentTypes).sort((a, b) => a.localeCompare(b)).join(', '),
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.activity.localeCompare(b.activity);
      }),
  };
}

function buildUserGroups(segments, workloadVisibleRows) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeRows = Array.isArray(workloadVisibleRows) ? workloadVisibleRows : [];

  const preferredUsers = safeRows
    .map((row) => String(row.user || '').trim())
    .filter((user) => user && user !== 'Idle');

  const preferredUserSet = new Set(preferredUsers);
  const grouped = new Map();

  safeSegments.forEach((segment) => {
    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (lane === 'Idle') return;
    if (preferredUserSet.size > 0 && !preferredUserSet.has(lane)) return;

    const durationSeconds = Number(segment.durationSeconds) || 0;
    if (durationSeconds <= 0) return;

    const activityLabel = toGanttSegmentTypeLabel(segment.segmentType);
    if (shouldExcludeDetailActivity(activityLabel, segment.documentLabel)) return;

    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push(segment);
  });

  const orderedUsers = preferredUsers.length > 0
    ? preferredUsers.filter((user) => grouped.has(user))
    : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  return orderedUsers.map((user) => {
    const activities = (grouped.get(user) || [])
      .slice()
      .sort((a, b) => a.startTs - b.startTs)
      .map((segment, idx) => ({
        id: segment.id || `${user}-${idx}`,
        activity: toGanttSegmentTypeLabel(segment.segmentType),
        start: segment.start,
        end: segment.end,
        durationSeconds: Number(segment.durationSeconds) || 0,
        documentLabel: segment.documentLabel,
      }));

    return {
      user,
      totalSeconds: activities.reduce((sum, activity) => sum + activity.durationSeconds, 0),
      activities,
    };
  });
}

function buildUserBreakdownGroups(segments, contributionRows) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeRows = Array.isArray(contributionRows) ? contributionRows : [];
  const preferredUsers = safeRows
    .map((row) => String(row.user || '').trim())
    .filter(Boolean);

  const preferredUserSet = new Set(preferredUsers);
  const grouped = new Map();

  safeSegments.forEach((segment) => {
    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (!lane || lane === 'Idle' || lane === 'System') return;

    const durationSeconds = Number(segment.durationSeconds) || 0;
    if (durationSeconds <= 0) return;

    const activityLabel = toGanttSegmentTypeLabel(segment.segmentType);
    if (shouldExcludeDetailActivity(activityLabel, segment.documentLabel)) return;

    const drillGroup = toDrillGroup(segment.segmentType);
    const type = drillGroup === 'Review' || drillGroup === 'ReviewAutoClose'
      ? 'Review'
      : (drillGroup === 'EditData' ? 'EditData' : (drillGroup === 'EditMeta' ? 'EditMeta' : ''));
    if (!type) return;

    if (preferredUserSet.size > 0 && !preferredUserSet.has(lane)) return;
    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push({
      id: segment.id || `${lane}-${segment.startTs}-${segment.segmentType}`,
      type,
      activity: activityLabel,
      start: segment.start,
      end: segment.end,
      startTs: segment.startTs,
      durationSeconds,
      documentLabel: segment.documentLabel,
    });
  });

  const orderedUsers = preferredUsers.length > 0
    ? preferredUsers.filter((user) => grouped.has(user))
    : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  return orderedUsers.map((user) => {
    const activities = (grouped.get(user) || []).slice().sort((a, b) => a.startTs - b.startTs);
    const reviewSeconds = activities.reduce((sum, item) => sum + (item.type === 'Review' ? item.durationSeconds : 0), 0);
    const editDataSeconds = activities.reduce((sum, item) => sum + (item.type === 'EditData' ? item.durationSeconds : 0), 0);
    const editMetaSeconds = activities.reduce((sum, item) => sum + (item.type === 'EditMeta' ? item.durationSeconds : 0), 0);
    return {
      user,
      reviewSeconds,
      editDataSeconds,
      editMetaSeconds,
      totalSeconds: reviewSeconds + editDataSeconds + editMetaSeconds,
      activities,
    };
  }).filter((row) => row.totalSeconds > 0);
}

function buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit, mergeSpread) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeSelected = Array.isArray(selectedSegmentTypes) ? selectedSegmentTypes : [];

  const resolveGroupKey = (segment) => {
    const drillGroup = toDrillGroup(segment.segmentType);
    const segmentGroup = toSegmentGroup(segment.segmentType);

    if (safeSelected.length > 0 && !safeSelected.includes(segmentGroup)) return null;
    if (!showProcessBreakdownIdle && drillGroup === 'Idle') return null;

    if (
      mergeSpread
      && (drillGroup === 'Processing' || drillGroup === 'Reprocessing')
    ) {
      return { key: 'spread', label: 'Spread', colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' };
    }
    if (
      mergeReviewAndEdit
      && (
        drillGroup === 'Review'
        || drillGroup === 'ReviewAutoClose'
        || drillGroup === 'EditData'
        || drillGroup === 'EditMeta'
      )
    ) {
      return { key: 'review-edit', label: 'Review & Edit', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    }
    if (drillGroup === 'Uploading') return { key: 'uploading', label: 'Uploading', colorClass: 'bg-slate-100 text-slate-700', dotClass: 'bg-slate-500' };
    if (drillGroup === 'Processing') return { key: 'processing', label: 'First Spread', colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' };
    if (drillGroup === 'Reprocessing') return { key: 'reprocess', label: 'Second Spread', colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]' };
    if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return { key: 'review', label: 'Review', colorClass: 'bg-[#ecfeff] text-[#0f766e]', dotClass: 'bg-[#06B6D4]' };
    if (drillGroup === 'EditData') return { key: 'edit-data', label: 'Edit Data', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    if (drillGroup === 'EditMeta') return { key: 'edit-meta', label: 'Edit Meta', colorClass: 'bg-[#fef2f2] text-[#9a3412]', dotClass: 'bg-[#C2410C]' };
    if (drillGroup === 'Idle') return { key: 'idle', label: 'Idle', colorClass: 'bg-slate-100 text-slate-600', dotClass: 'bg-slate-400' };
    return null;
  };

  const grouped = new Map();
  safeSegments.forEach((segment) => {
    const groupMeta = resolveGroupKey(segment);
    if (!groupMeta) return;

    const durationSeconds = Number(segment.durationSeconds) || 0;
    if (durationSeconds <= 0) return;

    const activityLabel = toGanttSegmentTypeLabel(segment.segmentType);
    if (shouldExcludeDetailActivity(activityLabel, segment.documentLabel)) return;

    if (!grouped.has(groupMeta.key)) grouped.set(groupMeta.key, { ...groupMeta, activities: [], totalSeconds: 0 });
    const entry = grouped.get(groupMeta.key);
    entry.activities.push({
      id: segment.id || `${groupMeta.key}-${segment.startTs}-${segment.segmentType}`,
      activity: activityLabel,
      start: segment.start,
      end: segment.end,
      startTs: segment.startTs,
      durationSeconds,
      documentLabel: segment.documentLabel,
    });
    entry.totalSeconds += durationSeconds;
  });

  const order = mergeReviewAndEdit
    ? (mergeSpread
      ? ['uploading', 'spread', 'review-edit', 'idle']
      : ['uploading', 'processing', 'reprocess', 'review-edit', 'idle'])
    : (mergeSpread
      ? ['uploading', 'spread', 'review', 'edit-data', 'edit-meta', 'idle']
      : ['uploading', 'processing', 'reprocess', 'review', 'edit-data', 'edit-meta', 'idle']);

  return order
    .filter((key) => grouped.has(key))
    .map((key) => {
      const group = grouped.get(key);
      return {
        ...group,
        activities: group.activities.slice().sort((a, b) => a.startTs - b.startTs),
      };
    })
    .filter((group) => group.totalSeconds > 0);
}

const TimelineDetailView = React.memo(({ segments, timelineSettings }) => {
  const { bars, summaryCards, sourceRows } = React.useMemo(
    () => buildTimelineDetailData(segments, timelineSettings),
    [segments, timelineSettings]
  );

  if (bars.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No timeline bar details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-3 grid-cols-2 max-sm:gap-2 sm:grid-cols-3 md:grid-cols-5">
          {summaryCards.map((card, idx) => (
            <div 
              key={card.key} 
              className={`rounded-2xl border border-slate-200 bg-white p-4 max-sm:p-3 shadow-sm animate-stagger-${Math.min(8, idx + 1)}`}
            >
              <div className="text-[11px] max-sm:text-[9px] max-sm:tracking-wider font-bold uppercase tracking-[0.18em] text-slate-500 truncate">{card.label}</div>
              <div className={`mt-2 max-sm:mt-1.5 text-3xl max-sm:text-2xl font-extrabold leading-none ${card.accentClass}`}>{card.count}</div>
              <div className="mt-2 max-sm:mt-1 text-xs max-sm:text-[10px] font-medium text-slate-500">bars</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white fade-slide-down" style={{ animationDelay: '300ms' }}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Source detail</div>
          <div className="text-xl font-bold text-[#17335f]">Bars in the current timeline</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white">
              <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-5 py-3">No.</th>
                <th className="px-5 py-3">Lane</th>
                <th className="px-5 py-3">Bar</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">End</th>
                <th className="px-5 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar, index) => (
                <tr key={bar.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                  <td className="px-5 py-4 font-semibold text-[#17335f]">{bar.lane}</td>
                  <td className="px-5 py-4 font-semibold text-[#17335f]">{bar.activity}</td>
                  <td className="px-5 py-4 text-slate-600">{bar.documentLabel}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(bar.start)}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(bar.end)}</td>
                  <td className="px-5 py-4 font-bold text-[#00a4e4]">{formatDuration(bar.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

const UserShareDetailView = React.memo(({ segments, workloadVisibleRows }) => {
  const [openUser, setOpenUser] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const { userGroups, renderError } = React.useMemo(() => {
    try {
      return {
        userGroups: buildUserGroups(segments, workloadVisibleRows),
        renderError: '',
      };
    } catch (error) {
      return {
        userGroups: [],
        renderError: error instanceof Error ? error.message : String(error),
      };
    }
  }, [segments, workloadVisibleRows]);

  if (renderError) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Failed to render user activity details: {renderError}
      </div>
    );
  }

  if (userGroups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No user activity details available for the current filters.
      </div>
    );
  }

  const toggleUser = (user) => {
    setOpenUser((current) => (current === user ? '' : user));
  };

  React.useLayoutEffect(() => {
    if (!openUser) {
      setContentHeight(0);
      return;
    }

    const measure = () => {
      const nextHeight = contentRef.current?.scrollHeight || 0;
      setContentHeight(nextHeight);
    };

    measure();

    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openUser]);

  return (
    <div className="space-y-6">
      {userGroups.map((group, userIndex) => (
        <section 
          key={group.user} 
          className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, userIndex + 1)}`}
        >
          <button
            type="button"
            onClick={() => toggleUser(group.user)}
            className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
          >
            <div className="flex items-center gap-2 min-w-0 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be] sm:h-11 sm:w-11">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">User {userIndex + 1}</div>
                <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.user}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                  <div className="text-sm font-bold text-[#17335f] sm:text-base">{formatDuration(group.totalSeconds)}</div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${openUser === group.user ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
              openUser === group.user
                ? 'translate-y-0 duration-[2000ms]'
                : '-translate-y-1 duration-500'
            }`}
            style={{ height: openUser === group.user ? `${contentHeight}px` : '0px' }}
          >
            <div
              ref={openUser === group.user ? contentRef : null}
              className="overflow-x-auto border-t border-slate-200"
              style={{ contain: 'layout paint' }}
            >
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-3">No.</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">End</th>
                    <th className="px-5 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {group.activities.map((activity, index) => (
                    <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                        {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                      <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                      <td className="px-5 py-4 font-bold text-[#00a4e4]">{formatDuration(activity.durationSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
});

const UserBreakdownDetailView = React.memo(({ rows, segments }) => {
  const [openUser, setOpenUser] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const preparedRows = React.useMemo(
    () => buildUserBreakdownGroups(segments, rows),
    [segments, rows]
  );

  if (preparedRows.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No user breakdown details available for the current filters.
      </div>
    );
  }

  React.useLayoutEffect(() => {
    if (!openUser) {
      setContentHeight(0);
      return;
    }

    const measure = () => {
      setContentHeight(contentRef.current?.scrollHeight || 0);
    };

    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openUser]);

  return (
    <div className="space-y-5">
      {preparedRows.map((row, index) => {
        const isOpen = openUser === row.user;
        const editDataActivities = row.activities.filter((activity) => activity.type === 'EditData');
        const editMetaActivities = row.activities.filter((activity) => activity.type === 'EditMeta');
        const reviewActivities = row.activities.filter((activity) => activity.type === 'Review');

        return (
          <section 
            key={row.user} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenUser((current) => (current === row.user ? '' : row.user))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be] sm:h-11 sm:w-11">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">User {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{row.user}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(row.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'
              }`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <div className="space-y-6 px-5 py-4">
                  {editDataActivities.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-[#fff7ed] px-4 py-3 text-[#c2410c]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                        <span className="text-sm font-bold uppercase tracking-[0.18em]">Edit Data</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              <th className="px-5 py-3">No.</th>
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editDataActivities.map((activity, index) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                                  {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                                <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(row.editDataSeconds)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {editMetaActivities.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-[#fef2f2] px-4 py-3 text-[#9a3412]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#C2410C]" />
                        <span className="text-sm font-bold uppercase tracking-[0.18em]">Edit Meta</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              <th className="px-5 py-3">No.</th>
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editMetaActivities.map((activity, index) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                                  {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                                <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(row.editMetaSeconds)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {reviewActivities.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-[#ecfeff] px-4 py-3 text-[#0f766e]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4]" />
                        <span className="text-sm font-bold uppercase tracking-[0.18em]">Review</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              <th className="px-5 py-3">No.</th>
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewActivities.map((activity, index) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                                  {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                                <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(row.reviewSeconds)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const TimeBreakdownDetailView = React.memo(({
  segments,
  selectedSegmentTypes,
  showProcessBreakdownIdle,
  mergeReviewAndEdit,
  mergeSpread,
}) => {
  const [openGroup, setOpenGroup] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const groups = React.useMemo(
    () => buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit, mergeSpread),
    [segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit, mergeSpread]
  );

  React.useLayoutEffect(() => {
    if (!openGroup) {
      setContentHeight(0);
      return;
    }

    const measure = () => setContentHeight(contentRef.current?.scrollHeight || 0);
    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openGroup]);

  if (groups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No time breakdown details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        const isOpen = openGroup === group.key;
        return (
          <section 
            key={group.key} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${group.colorClass}`}>
                  <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">Group {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'}`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="overflow-x-auto border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-3">No.</th>
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity, activityIndex) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-500">{activityIndex + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                          {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                        <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const TransitionBreakdownDetailView = React.memo(({ segments }) => {
  const [openGroup, setOpenGroup] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const groups = React.useMemo(() => {
    const colorMap = {
      'after-processing': { colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' },
      'after-reprocessing': { colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]' },
      'between-review-edit': { colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' },
    };

    return buildTransitionBreakdownGroups(segments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review & Edit',
    })
      .map((group) => {
        const activities = group.activities
          .slice()
          .sort((a, b) => a.startTs - b.startTs)
          .map((activity) => ({
            ...activity,
            activity: toGanttSegmentTypeLabel(activity.activity),
          }))
          .filter((activity) => !shouldExcludeDetailActivity(activity.activity, activity.documentLabel));
        const totalSeconds = activities.reduce((sum, activity) => sum + (Number(activity.durationSeconds) || 0), 0);

        return {
          ...group,
          ...colorMap[group.key],
          activities,
          totalSeconds,
          averageSeconds: activities.length > 0 ? totalSeconds / activities.length : 0,
        };
      })
      .filter((group) => group.activities.length > 0);
  }, [segments]);

  React.useLayoutEffect(() => {
    if (!openGroup) {
      setContentHeight(0);
      return;
    }
    const measure = () => setContentHeight(contentRef.current?.scrollHeight || 0);
    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openGroup]);

  if (groups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No transition breakdown details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        const isOpen = openGroup === group.key;
        return (
          <section 
            key={group.key} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${group.colorClass}`}>
                  <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">Group {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 sm:gap-3">
                <div className="hidden min-[440px]:flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Average</div>
                    <div className="text-sm font-bold text-[#17335f] sm:text-base">{formatDuration(group.averageSeconds)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'}`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="overflow-x-auto border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-3">No.</th>
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity, activityIndex) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-500">{activityIndex + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                          {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                        <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">
                        {formatDuration(group.totalSeconds)}
                        <span className="ml-2 text-xs font-semibold text-slate-500">/ {group.activities.length}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const KpiBreakdownView = React.memo(({ kpiId, segments, expanded = false }) => {
  const chartData = React.useMemo(() => {
    const sheetMap = new Map();
    // Numeric IDs from buildKpiData: 1=User, 6=System, 8=Idle, 7=Total, 2=Users count
    const isDurationMetric = kpiId !== '2';

    // Filter segments based on KPI type to ensure each card shows its own relevant data
    const filteredSegments = segments.filter(s => {
      const type = String(s.segmentType || '');
      // User Time (id: 1)
      if (kpiId === '1' || kpiId === 'total-users') { // Support both string and numeric IDs
        return type.startsWith('USER_');
      }
      // System Time (id: 6)
      if (kpiId === '6' || kpiId === 'system-time') {
        return type.startsWith('SYSTEM_') || isProcessingEquivalentIdleSegment(type);
      }
      // Idle Time (id: 8)
      if (kpiId === '8' || kpiId === 'idle-time') {
        return isIdleContextSegment(type);
      }
      // Total Lead Time (id: 7) - uses all segments to calculate spans per sheet later
      if (kpiId === '7' || kpiId === 'total-time') {
        return true; 
      }
      // Contributing Users Count (id: 2)
      if (kpiId === '2') {
        return type.startsWith('USER_');
      }
      return true;
    });

    if (kpiId === '7' || kpiId === 'total-time') {
      // For Total Lead Time, we calculate the span (MaxEnd - MinStart) per sheet
      const spans = new Map();
      filteredSegments.forEach(s => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        if (!spans.has(key)) {
          spans.set(key, { name: label, minStart: s.startTs, maxEnd: s.endTs });
        } else {
          const entry = spans.get(key);
          entry.minStart = Math.min(entry.minStart, s.startTs);
          entry.maxEnd = Math.max(entry.maxEnd, s.endTs);
        }
      });
      spans.forEach((val, key) => {
        sheetMap.set(key, { name: val.name, value: Math.max(0, (val.maxEnd - val.minStart) / 1000) });
      });
    } else if (kpiId === '2') {
      // For Contributing Users, we count unique userNames per sheet
      const userSets = new Map();
      filteredSegments.forEach(s => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        const user = String(s.userName || '').trim();
        if (!user || user.toLowerCase() === 'system') return;
        
        if (!userSets.has(key)) {
          userSets.set(key, { name: label, users: new Set() });
        }
        userSets.get(key).users.add(user);
      });
      userSets.forEach((val, key) => {
        sheetMap.set(key, { name: val.name, value: val.users.size });
      });
    } else {
      // Normal duration or occurrence sum
      filteredSegments.forEach((s) => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        if (!sheetMap.has(key)) {
          sheetMap.set(key, { name: label, value: 0 });
        }
        const entry = sheetMap.get(key);
        entry.value += (Number(s.durationSeconds) || 0);
      });
    }

    // Sort alphabetically by sheet name as requested (ห้เรียงามชื่อไม่ใช่มากไปน้อย)
    return Array.from(sheetMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [segments, kpiId]);

  const isDurationDisplay = kpiId !== '2';

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 flex-1 min-h-[300px] sm:min-h-[400px]">
        <SheetBreakdownChart 
          data={chartData} 
          isDuration={isDurationDisplay} 
          expanded={expanded} 
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {chartData.slice(0, 6).map((item, idx) => {
          const avg = chartData.reduce((a,b)=>a+b.value,0)/Math.max(1, chartData.length);
          return (
            <div key={item.name} className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{item.name}</div>
                <div className="text-base sm:text-lg font-extrabold text-[#17335f]">
                  {isDurationDisplay ? formatDuration(item.value) : item.value.toLocaleString()}
                </div>
              </div>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${item.value >= avg ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                #{idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const isKpiBreakdown = visualizationId.startsWith('kpi-breakdown-');
  const isSheetBreakdownFullView = visualizationId === 'sheet-total-time'
    || visualizationId === 'sheet-user-time'
    || visualizationId === 'sheet-system-time'
    || visualizationId === 'sheet-idle-time';
  const kpiId = isKpiBreakdown ? visualizationId.replace('kpi-breakdown-', '') : '';

  const modalTitle = isKpiBreakdown
    ? `KPI Breakdown: ${
        kpiId === '7' ? 'Total Time' :
        kpiId === '1' ? 'User Time' :
        kpiId === '6' ? 'System Time' :
        kpiId === '8' ? 'Idle Time' :
        kpiId === '2' ? 'Contributing Users' : 'Performance Metric'
      }`
    : visualizationId === 'gantt-detail'
    ? 'Timeline Source Details'
    : visualizationId === 'donut-detail'
    ? 'Visualization Source Details'
    : visualizationId === 'contribution-detail'
      ? 'User Breakdown Details'
      : visualizationId === 'process-breakdown-detail'
      ? 'Time Breakdown Details'
      : visualizationId === 'matrix-detail'
        ? 'Average Transition Time Details'
      : visualizationId === 'sheet-matrix-detail'
        ? 'Sheet Breakdown Details'
      : visualizationId === 'sheet-total-time'
        ? 'Total Time By Sheet'
      : visualizationId === 'sheet-user-time'
        ? 'User Time By Sheet'
      : visualizationId === 'sheet-system-time'
        ? 'System Time By Sheet'
      : visualizationId === 'sheet-idle-time'
        ? 'Idle Time By Sheet'
      : 'Full View Analysis';
      const modalSubtitle = isKpiBreakdown
      ? `Breakdown of ${
      kpiId === '7' ? 'Lead Time' :
      kpiId === '1' ? 'Active User Sessions' :
      kpiId === '6' ? 'System Processing' :
      kpiId === '8' ? 'Idle Waiting' :
      kpiId === '2' ? 'Unique Contributors' : 'Selected Metric'
      } By Sheet`
      : visualizationId === 'gantt-detail'
      ? 'Bars Counted From Interval Segments Only'
      : visualizationId === 'donut-detail'
      ? 'User Activity Timeline'
      : visualizationId === 'contribution-detail'
      ? 'Review And Edit Summary'
      : visualizationId === 'process-breakdown-detail'
      ? 'Grouped By Y-Axis Labels'
      : visualizationId === 'matrix-detail'
        ? 'Average Transition Source Rows'
      : visualizationId === 'sheet-matrix-detail'
        ? 'Individual Sheet Processing Summary'
      : visualizationId === 'sheet-total-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-user-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-system-time'
        ? 'Expanded breakdown for all visible sheets'
      : visualizationId === 'sheet-idle-time'
        ? 'Expanded breakdown for all visible sheets'
      : 'Advanced Visualization';

  const {
    ganttVisibleSegments,
    chartBaseSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    workloadVisibleRows,
    contributionRows,
    mergeReviewAndEdit,
    mergeSpread,
    sheetPerformanceSegments,
    sheetPerformanceChartSettings,
    setSelectedGanttSegment,
    timelineSettings,
  } = data;

  const sheetPerformanceChartData = React.useMemo(
    () => buildSheetPerformanceChartsData(sheetPerformanceSegments),
    [sheetPerformanceSegments]
  );
  const sortedSheetPerformanceChartData = React.useMemo(() => ({
    totalTimeData: sortSheetPerformanceChartData(sheetPerformanceChartData.totalTimeData, sheetPerformanceChartSettings?.totalTime?.sortOrder),
    userTimeData: sortSheetPerformanceChartData(selectUserTimeChartData(sheetPerformanceChartData.userTimeData, sheetPerformanceChartSettings?.userTime?.mode), sheetPerformanceChartSettings?.userTime?.sortOrder),
    systemTimeData: sortSheetPerformanceChartData(sheetPerformanceChartData.systemTimeData, sheetPerformanceChartSettings?.systemTime?.sortOrder),
    idleTimeData: sortSheetPerformanceChartData(sheetPerformanceChartData.idleTimeData, sheetPerformanceChartSettings?.idleTime?.sortOrder),
  }), [sheetPerformanceChartData, sheetPerformanceChartSettings]);
  const userTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.userTime?.mode && sheetPerformanceChartSettings.userTime.mode !== 'all'
      ? getUserTimeChartAppearance(sheetPerformanceChartSettings.userTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );
  const totalTimeAppearance = React.useMemo(
    () => sheetPerformanceChartSettings?.totalTime?.mode && sheetPerformanceChartSettings.totalTime.mode !== 'all'
      ? getTotalTimeChartAppearance(sheetPerformanceChartSettings.totalTime.mode)
      : null,
    [sheetPerformanceChartSettings]
  );

  const processBreakdownData = React.useMemo(() => {
    const totals = {
      Uploading: 0,
      Processing: 0,
      Reprocess: 0,
      Review: 0,
      EditData: 0,
      EditMeta: 0,
      Idle: 0,
    };
    const sourceSegments = chartBaseSegments || ganttVisibleSegments;
    sourceSegments.forEach(s => {
      const drillGroup = toDrillGroup(s.segmentType);
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'EditData') totals.EditData += duration;
      else if (drillGroup === 'EditMeta') totals.EditMeta += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });

    let items = [];
    if (mergeReviewAndEdit) {
      const mergedReviewEdit = totals.Review + totals.EditData + totals.EditMeta;
      items = [
        { label: 'Uploading', seconds: totals.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading },
        ...(mergeSpread
          ? [{ label: 'Spread', seconds: totals.Processing + totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Processing }]
          : [
            { label: 'Processing', seconds: totals.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing },
            { label: 'Reprocess', seconds: totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Reprocessing },
          ]),
        { label: 'Review And Edit', seconds: mergedReviewEdit, color: '#F59E0B' },
      ];
    } else {
      items = Object.entries(totals)
        .filter(([label]) => label !== 'Idle')
        .map(([label, seconds]) => ({
          label,
          seconds,
          color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
        }));
      if (mergeSpread) {
        const mergedItems = [];
        let spreadInserted = false;
        items.forEach((item) => {
          if (item.label === 'Processing' || item.label === 'Reprocess') {
            if (!spreadInserted) {
              mergedItems.push({
                label: 'Spread',
                seconds: totals.Processing + totals.Reprocess,
                color: GANTT_DRILL_GROUP_COLORS.Processing,
              });
              spreadInserted = true;
            }
            return;
          }
          mergedItems.push(item);
        });
        items = mergedItems;
      }
    }

    const completeSeconds = (
      totals.Uploading
      + totals.Processing
      + totals.Reprocess
      + totals.Review
      + totals.EditData
      + totals.EditMeta
    );
    if (completeSeconds > 0) {
      items.push({
        label: 'Complete',
        seconds: completeSeconds,
        color: '#16A34A'
      });
    }
    return items;
  }, [ganttVisibleSegments, chartBaseSegments, mergeReviewAndEdit, mergeSpread, showProcessBreakdownIdle]);

  const transitionTimeData = React.useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments || ganttVisibleSegments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review And Edit',
    });
  }, [ganttVisibleSegments, chartBaseSegments]);

  const donutAnimationKey = React.useMemo(
    () => buildChartAnimationKey(workloadVisibleRows, ['totalSeconds', 'share']),
    [workloadVisibleRows]
  );

  const contributionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(contributionRows, ['reviewSeconds', 'editDataSeconds', 'editMetaSeconds', 'totalSeconds', 'reworkRate']),
    [contributionRows]
  );

  const processBreakdownAnimationKey = React.useMemo(
    () => buildChartAnimationKey(processBreakdownData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [processBreakdownData]
  );

  const transitionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(transitionTimeData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [transitionTimeData]
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 md:p-8 viz-overlay-enter overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white w-full h-full sm:max-w-[95vw] sm:h-[92vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden viz-panel-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 md:px-10 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#17335f] truncate">{modalTitle}</h2>
            <p className="text-[9px] sm:text-sm text-slate-500 font-bold uppercase tracking-wider truncate">{modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl sm:rounded-2xl transition-all hover:rotate-90 duration-300 shrink-0">
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto no-scrollbar min-w-0 ${isSheetBreakdownFullView ? 'p-3 sm:px-6 sm:pb-6 sm:pt-4 md:px-8 md:pb-8 md:pt-4' : 'p-4 sm:p-6 md:p-10'}`}>
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'gantt' && (
              <GanttTimelineChart
                segments={ganttVisibleSegments}
                onSelectSegment={setSelectedGanttSegment}
                expanded
                singleLane={timelineSettings?.singleLane}
                showSystemLane={timelineSettings?.showSystemLane}
                showIdleLane={timelineSettings?.showIdleLane}
                showStarMarkers={timelineSettings?.showStarMarkers}
                collapseGaps={timelineSettings?.collapseGaps}
                showGanttLegend={timelineSettings?.showGanttLegend}
              />
            )}
            {visualizationId === 'donut' && <DonutWorkloadChart key={donutAnimationKey} rows={workloadVisibleRows} expanded />}
          </Suspense>
          {visualizationId === 'gantt-detail' && <TimelineDetailView segments={ganttVisibleSegments} timelineSettings={timelineSettings} />}
          {visualizationId === 'donut-detail' && (
            <UserShareDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              workloadVisibleRows={workloadVisibleRows}
            />
          )}
          {visualizationId === 'contribution-detail' && (
            <UserBreakdownDetailView rows={contributionRows} segments={chartBaseSegments || ganttVisibleSegments} />
          )}
          {visualizationId === 'process-breakdown-detail' && (
            <TimeBreakdownDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              selectedSegmentTypes={selectedSegmentTypes}
              showProcessBreakdownIdle={showProcessBreakdownIdle}
              mergeReviewAndEdit={mergeReviewAndEdit}
              mergeSpread={mergeSpread}
            />
          )}
          {visualizationId === 'matrix-detail' && (
            <TransitionBreakdownDetailView segments={ganttVisibleSegments} />
          )}
          {isKpiBreakdown && (
            <KpiBreakdownView kpiId={kpiId} segments={chartBaseSegments || ganttVisibleSegments} expanded />
          )}
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart key={processBreakdownAnimationKey} data={processBreakdownData} showLabels />}
            {visualizationId === 'contribution' && <UserContributionStackChart key={contributionAnimationKey} rows={contributionRows} expanded />}
            {visualizationId === 'matrix' && <ProcessTimeBreakdownChart key={transitionAnimationKey} data={transitionTimeData} showLabels />}
            {visualizationId === 'sheet-matrix' && <SheetProcessMatrix segments={chartBaseSegments || ganttVisibleSegments} expanded />}
            {visualizationId === 'sheet-total-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.totalTimeData}
                isDuration
                expanded
                showAverageLine={sheetPerformanceChartSettings?.totalTime?.showAverageLine !== false}
                activeFill={totalTimeAppearance?.activeFill}
                inactiveFill={totalTimeAppearance?.inactiveFill}
                valueLabelFill={totalTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-user-time' && (
              <SheetBreakdownChart
                data={sortedSheetPerformanceChartData.userTimeData}
                isDuration
                expanded
                showAverageLine={sheetPerformanceChartSettings?.userTime?.showAverageLine !== false}
                activeFill={userTimeAppearance?.activeFill}
                inactiveFill={userTimeAppearance?.inactiveFill}
                valueLabelFill={userTimeAppearance?.valueLabelFill}
              />
            )}
            {visualizationId === 'sheet-system-time' && <SheetBreakdownChart data={sortedSheetPerformanceChartData.systemTimeData} isDuration expanded showAverageLine={sheetPerformanceChartSettings?.systemTime?.showAverageLine !== false} />}
            {visualizationId === 'sheet-idle-time' && <SheetBreakdownChart data={sortedSheetPerformanceChartData.idleTimeData} isDuration expanded showAverageLine={sheetPerformanceChartSettings?.idleTime?.showAverageLine !== false} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
});
