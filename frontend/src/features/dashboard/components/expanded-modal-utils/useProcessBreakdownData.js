import { useMemo } from 'react';
import { toDrillGroup } from '@/features/dashboard/utils/segmentUtils.js';
import { GANTT_DRILL_GROUP_COLORS } from '@/lib/constants.js';

export function useProcessBreakdownData(
  ganttVisibleSegments,
  chartBaseSegments,
  mergeReviewAndEdit,
  mergeSpread,
  showProcessBreakdownIdle
) {
  return useMemo(() => {
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
}
