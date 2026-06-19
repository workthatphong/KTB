import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toGanttSegmentTypeLabel } from '../../../../lib/segmentUtils.js';
import { buildTransitionBreakdownGroups } from '../../utils/transitionMetrics.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

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


export { TransitionBreakdownDetailView };
