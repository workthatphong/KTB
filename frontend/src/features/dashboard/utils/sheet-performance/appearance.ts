// @ts-nocheck
import { GANTT_DRILL_GROUP_COLORS } from '@/lib/constants.js';

export function getTotalTimeChartAppearance(mode = 'all') {
  if (mode === 'complete') {
    return {
      activeFill: '#16A34A',
      inactiveFill: '#94a3b8',
      valueLabelFill: '#16A34A',
    };
  }
  return null;
}

export function getSystemTimeChartAppearance(mode = 'all') {
  if (mode === 'firstSpread') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Processing,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Processing,
    };
  }
  if (mode === 'secondSpread') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Reprocessing,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Reprocessing,
    };
  }
  return null;
}

export function getIdleTimeChartAppearance(mode = 'all') {
  if (mode !== 'all' && mode !== 'default') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Idle,
      inactiveFill: '#cbd5e1',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Idle,
    };
  }
  return null;
}

export function getUserTimeChartAppearance(mode = 'all') {
  if (mode === 'upload') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Uploading,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Uploading,
    };
  }
  if (mode === 'review') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Review,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Review,
    };
  }
  if (mode === 'reviewCount') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.Review,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.Review,
    };
  }
  if (mode === 'editData') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditData,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditData,
    };
  }
  if (mode === 'editDataCount') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditData,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditData,
    };
  }
  if (mode === 'editMeta') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
    };
  }
  if (mode === 'editMetaCount') {
    return {
      activeFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
      inactiveFill: '#94a3b8',
      valueLabelFill: GANTT_DRILL_GROUP_COLORS.EditMeta,
    };
  }
  return null;
}

