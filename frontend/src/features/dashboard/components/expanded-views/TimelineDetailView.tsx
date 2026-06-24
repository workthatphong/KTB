// @ts-nocheck
import React from 'react';
import { formatDuration, toDisplayDate } from '@/lib/utils';
import { mapSegmentsToRows } from '@/features/timeline/timelineUtils';
import { mergeContinuousReprocessingSegments, toTimelineLane } from '@/features/dashboard/utils/segmentUtils';
import { isTimelineDurationSegment, toTimelineDetailCountKey, toTimelineBarLabel, shouldExcludeDetailActivity } from '@/features/dashboard/utils/expandedViewUtils';

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


export { TimelineDetailView };
