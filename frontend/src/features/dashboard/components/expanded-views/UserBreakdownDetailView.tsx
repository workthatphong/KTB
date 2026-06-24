// @ts-nocheck
import React from 'react';
import { Clock, User, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '@/lib/utils';
import { toTimelineLane, toGanttSegmentTypeLabel, toDrillGroup } from '@/features/dashboard/utils/segmentUtils';
import { shouldExcludeDetailActivity } from '@/features/dashboard/utils/expandedViewUtils';

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


export { UserBreakdownDetailView };
