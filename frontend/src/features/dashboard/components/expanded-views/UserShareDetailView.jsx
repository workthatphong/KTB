import React from 'react';
import { Clock, User, ChevronDown } from 'lucide-react';
import { formatDuration, toDisplayDate } from '../../../../lib/utils.js';
import { toTimelineLane, toGanttSegmentTypeLabel } from '../../../../lib/segmentUtils.js';
import { shouldExcludeDetailActivity } from '../../utils/expandedViewUtils.js';

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


export { UserShareDetailView };
