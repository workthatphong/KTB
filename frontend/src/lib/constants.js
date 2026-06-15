import {
  Clock, Users, Timer, RefreshCw, AlertTriangle
} from 'lucide-react';

export const API_BASE = '';
export const FRONTEND_BUILD_VERSION = '2026-06-01-cloud-sync-status-3';
// ... rest of exports ...
export const initialKpiData = [
  { id: 7, label: 'Total time', value: '-', subtext: '', icon: Timer, color: 'text-[#3860be]', bg: 'bg-[#eef3ff]' },
  { id: 1, label: 'User Time', value: '-', subtext: '', icon: Clock, color: 'text-[#00a4e4]', bg: 'bg-[#e8f7fd]' },
  { id: 6, label: 'System Time', value: '-', subtext: '', icon: Clock, color: 'text-[#334155]', bg: 'bg-slate-100' },
  { id: 8, label: 'Idle Time', value: '-', subtext: '', icon: Clock, color: 'text-[#94A3B8]', bg: 'bg-slate-50' },
  { id: 2, label: 'Users', value: '0', subtext: '', icon: Users, color: 'text-[#3860be]', bg: 'bg-[#eef3ff]' },
];
export const REOPEN_MARKER_TYPES = new Set(['REOPEN_MARKER', 'REOPEN_TO_REVIEW_HANDOFF_MARKER']);
export const PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES = new Set(['IDLE_WAITING_FOR_SCHEDULED_REPROCESS']);
export const COMPLETE_MARKER_COLOR = '#16A34A';
export const REPROCESSING_SEGMENT_MERGE_GAP_MS = 1000;
export const MARKER_STAR_OUTER_RADIUS = 5.2;
export const MARKER_STAR_INNER_RADIUS = 2.3;
export const MARKER_STAR_MIN_GAP_PX = 12;
export const oldvisualizcolor = {
  chartPalette: ['#2563EB', '#0EA5E9', '#14B8A6', '#22C55E', '#EAB308', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'],
  segmentColors: {
    USER_REVIEW_COMMENT_CHECK: '#06B6D4',
    USER_EDITING_CORRECTION: '#F59E0B',
    USER_EDITING_METADATA_CORRECTION: '#C2410C',
    USER_COMPLETION_APPROVAL: '#10B981',
    USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: '#059669',
    USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL: '#047857',
    USER_UPLOADING: '#8B5CF6',
    USER_REVIEW_AUTO_TIMEOUT: '#EF4444',
    SYSTEM_INITIAL_PROCESSING: '#334155',
    SYSTEM_SCHEDULED_REPROCESSING: '#334155',
    SYSTEM_INTERNAL_TRANSITION: '#334155',
    IDLE_WAITING_FOR_REVIEW: '#94A3B8',
    IDLE_WAITING_FOR_REREVIEW: '#94A3B8',
    IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#334155',
    IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
    AUTO_TIMEOUT_MARKER: '#DC2626',
    SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
    REOPEN_MARKER: '#A855F7',
  },
  ganttDrillGroupColors: {
    Uploading: '#8B5CF6',
    Processing: '#334155',
    Review: '#06B6D4',
    ReviewAutoClose: '#06B6D4',
    Reprocessing: '#334155',
    EditData: '#F59E0B',
    EditMeta: '#C2410C',
    EditAndComplete: '#10B981',
    Idle: '#94A3B8',
  },
  chartAccent: '#2563EB',
  chartSecondary: '#0EA5E9',
  chartPositive: '#10B981',
  matrixPalette: ['#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#D946EF', '#84CC16', '#F97316'],
};
export const CHART_PALETTE = oldvisualizcolor.chartPalette;
export const SEGMENT_COLORS = {
  USER_REVIEW_COMMENT_CHECK: oldvisualizcolor.segmentColors.USER_REVIEW_COMMENT_CHECK,
  USER_EDITING_CORRECTION: oldvisualizcolor.segmentColors.USER_EDITING_CORRECTION,
  USER_EDITING_METADATA_CORRECTION: oldvisualizcolor.segmentColors.USER_EDITING_METADATA_CORRECTION,
  USER_COMPLETION_APPROVAL: oldvisualizcolor.segmentColors.USER_COMPLETION_APPROVAL,
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: oldvisualizcolor.segmentColors.USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL,
  USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL: oldvisualizcolor.segmentColors.USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL,
  USER_UPLOADING: oldvisualizcolor.segmentColors.USER_UPLOADING,
  USER_REVIEW_AUTO_TIMEOUT: oldvisualizcolor.segmentColors.USER_REVIEW_AUTO_TIMEOUT,
  SYSTEM_INITIAL_PROCESSING: '#334155',
  SYSTEM_SCHEDULED_REPROCESSING: '#334155',
  SYSTEM_INTERNAL_TRANSITION: '#334155',
  IDLE_WAITING_FOR_REVIEW: '#94A3B8',
  IDLE_WAITING_FOR_REREVIEW: '#94A3B8',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#334155',
  IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
  AUTO_TIMEOUT_MARKER: '#DC2626',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
  REOPEN_MARKER: '#A855F7',
};
export const SEGMENT_TYPE_SHORT_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed',
  USER_EDITING_CORRECTION: 'Edit Data',
  USER_EDITING_METADATA_CORRECTION: 'Edit Meta',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit Data & Complete',
  USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit Meta & Complete',
  USER_UPLOADING: 'Upload',
  SYSTEM_INITIAL_PROCESSING: 'First Spread',
  SYSTEM_SCHEDULED_REPROCESSING: 'Second Spread',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Second Spread',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'Second Spread',
  REOPEN_MARKER: 'Reopen',
};
export const GANTT_SEGMENT_DISPLAY_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_EDITING_CORRECTION: 'Edit Data',
  USER_EDITING_METADATA_CORRECTION: 'Edit Meta',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit Data & Complete',
  USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit Meta & Complete',
  USER_UPLOADING: 'Upload',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed (Timeout)',
  SYSTEM_INITIAL_PROCESSING: 'First Spread',
  SYSTEM_SCHEDULED_REPROCESSING: 'Second Spread',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Second Spread',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'Second Spread',
  REOPEN_MARKER: 'Reopen Marker',
};

export const GANTT_DRILL_GROUPS = [
  { key: 'Uploading', label: 'Uploading', color: oldvisualizcolor.ganttDrillGroupColors.Uploading },
  { key: 'Processing', label: 'First Spread', color: oldvisualizcolor.ganttDrillGroupColors.Processing },
  { key: 'Idle', label: 'Idle', color: oldvisualizcolor.ganttDrillGroupColors.Idle },
  { key: 'Review', label: 'Review', color: oldvisualizcolor.ganttDrillGroupColors.Review },
  { key: 'ReviewAutoClose', label: 'Review Auto Close', color: oldvisualizcolor.ganttDrillGroupColors.ReviewAutoClose },
  { key: 'Reprocessing', label: 'Second Spread', color: oldvisualizcolor.ganttDrillGroupColors.Reprocessing },
  { key: 'EditData', label: 'Edit Data', color: oldvisualizcolor.ganttDrillGroupColors.EditData },
  { key: 'EditMeta', label: 'Edit Meta', color: oldvisualizcolor.ganttDrillGroupColors.EditMeta },
  { key: 'EditAndComplete', label: 'Complete', color: oldvisualizcolor.ganttDrillGroupColors.EditAndComplete },
];

export const GANTT_MIN_ZOOM_SCALE = 0.035;
export const GANTT_MAX_ZOOM_SCALE = 8000;
export const GANTT_MAX_TIMELINE_WIDTH_PX = 120000000;

export const GANTT_DRILL_GROUP_COLORS = {
  Uploading: oldvisualizcolor.ganttDrillGroupColors.Uploading,
  Processing: oldvisualizcolor.ganttDrillGroupColors.Processing,
  Review: oldvisualizcolor.ganttDrillGroupColors.Review,
  ReviewAutoClose: oldvisualizcolor.ganttDrillGroupColors.ReviewAutoClose,
  Reprocessing: oldvisualizcolor.ganttDrillGroupColors.Reprocessing,
  EditData: oldvisualizcolor.ganttDrillGroupColors.EditData,
  EditMeta: oldvisualizcolor.ganttDrillGroupColors.EditMeta,
  EditAndComplete: oldvisualizcolor.ganttDrillGroupColors.EditAndComplete,
  Idle: oldvisualizcolor.ganttDrillGroupColors.Idle,
};

export const GANTT_DRILL_GROUP_LABELS = {
  Uploading: 'Uploading',
  Processing: 'First Spread',
  Review: 'Review',
  ReviewAutoClose: 'Review Auto Close',
  Reprocessing: 'Second Spread',
  EditData: 'Edit Data',
  EditMeta: 'Edit Meta',
  EditAndComplete: 'Complete',
  Idle: 'Idle',
};

export const CORE_WORK_SESSION_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_EDITING_METADATA_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL',
]);
export const WORKFLOW_FLOW_SEGMENT_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_EDITING_METADATA_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_UPLOADING',
  'SYSTEM_INITIAL_PROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
  'SYSTEM_INTERNAL_TRANSITION',
  'IDLE_WAITING_FOR_REVIEW',
  'IDLE_WAITING_FOR_REREVIEW',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS',
  'IDLE_AFTER_SYSTEM_REPROCESS',
  'POST_COMPLETED_ELAPSED',
]);

export const FLOW_INSIGHT_GROUPS = [
  {
    id: 'processing-round-1-to-user',
    label: 'Round 1 Processing -> User Action',
    description: '',
  },
  {
    id: 'processing-round-2-to-user',
    label: 'Round 2 Processing -> User Action',
    description: '',
  },
  {
    id: 'user-review-edit-to-next-user-step',
    label: 'User Action -> Next User Step',
    description: '',
  },
  {
    id: 'upload-to-latest-complete',
    label: 'Upload -> Final Complete',
    description: '',
  },
];

export const TRANSITION_FRIENDLY_LABELS = {
  'USER_UPLOADING=>SYSTEM_INITIAL_PROCESSING': 'Upload complete -> System starts processing',
  'USER_UPLOADING=>IDLE_WAITING_FOR_REVIEW': 'Upload complete -> Waiting for review',
  'USER_UPLOADING=>USER_REVIEW_COMMENT_CHECK': 'Upload complete -> Review starts immediately',
  'USER_UPLOADING=>USER_REVIEW_AUTO_TIMEOUT': 'Upload complete -> No reviewer (timeout)',
  'SYSTEM_INITIAL_PROCESSING=>IDLE_WAITING_FOR_REVIEW': 'Processing complete -> Waiting for review',
  'SYSTEM_INITIAL_PROCESSING=>USER_REVIEW_COMMENT_CHECK': 'Processing complete -> Review starts immediately',
  'SYSTEM_INITIAL_PROCESSING=>USER_EDITING_CORRECTION': 'Processing complete -> Edit starts immediately',
  'SYSTEM_INITIAL_PROCESSING=>USER_EDITING_METADATA_CORRECTION': 'Processing complete -> Edit meta starts immediately',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for review -> Review starts',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_AUTO_TIMEOUT': 'Waiting too long for review -> Timeout',
  'IDLE_WAITING_FOR_REREVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for re-review -> Review starts',
  'IDLE_WAITING_FOR_REREVIEW=>USER_EDITING_CORRECTION': 'Waiting for re-review -> Edit starts',
  'IDLE_WAITING_FOR_REREVIEW=>USER_EDITING_METADATA_CORRECTION': 'Waiting for re-review -> Edit meta starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_REVIEW_COMMENT_CHECK': 'Reprocess complete -> Review starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_EDITING_CORRECTION': 'Reprocess complete -> Edit starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_EDITING_METADATA_CORRECTION': 'Reprocess complete -> Edit meta starts',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS=>SYSTEM_SCHEDULED_REPROCESSING': 'Queued -> System reprocessing',
  'USER_REVIEW_COMMENT_CHECK=>USER_COMPLETION_APPROVAL': 'Review passed -> Complete approval',
  'USER_REVIEW_COMMENT_CHECK=>USER_EDITING_CORRECTION': 'Review failed -> Send to edit',
  'USER_REVIEW_COMMENT_CHECK=>USER_EDITING_METADATA_CORRECTION': 'Review failed -> Send to edit meta',
  'USER_REVIEW_COMMENT_CHECK=>IDLE_WAITING_FOR_REREVIEW': 'Review done -> Waiting re-review',
  'USER_REVIEW_COMMENT_CHECK=>SYSTEM_SCHEDULED_REPROCESSING': 'Review done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_COMPLETION_APPROVAL': 'Edit done -> Complete approval',
  'USER_EDITING_CORRECTION=>IDLE_WAITING_FOR_REREVIEW': 'Edit done -> Waiting re-review',
  'USER_EDITING_CORRECTION=>SYSTEM_SCHEDULED_REPROCESSING': 'Edit done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_REVIEW_COMMENT_CHECK': 'Edit done -> Back to review',
  'USER_EDITING_METADATA_CORRECTION=>USER_COMPLETION_APPROVAL': 'Edit meta done -> Complete approval',
  'USER_EDITING_METADATA_CORRECTION=>IDLE_WAITING_FOR_REREVIEW': 'Edit meta done -> Waiting re-review',
  'USER_EDITING_METADATA_CORRECTION=>SYSTEM_SCHEDULED_REPROCESSING': 'Edit meta done -> Send to system reprocess',
  'USER_EDITING_METADATA_CORRECTION=>USER_REVIEW_COMMENT_CHECK': 'Edit meta done -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_EDITING_CORRECTION': 'Review timeout -> Back to edit',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_EDITING_METADATA_CORRECTION': 'Review timeout -> Back to edit meta',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_REVIEW_COMMENT_CHECK': 'Review timeout -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>IDLE_WAITING_FOR_REREVIEW': 'Review timeout -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Approval complete -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>SYSTEM_SCHEDULED_REPROCESSING': 'Approval complete -> Send to system reprocess',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Edit + approval -> Waiting re-review',
  'USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Edit meta + approval -> Waiting re-review',
  'SYSTEM_SCHEDULED_REPROCESSING=>IDLE_AFTER_SYSTEM_REPROCESS': 'System reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_REVIEW_COMMENT_CHECK': 'System reprocess complete -> Review starts',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_EDITING_CORRECTION': 'System reprocess complete -> Edit starts',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_EDITING_METADATA_CORRECTION': 'System reprocess complete -> Edit meta starts',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>IDLE_AFTER_SYSTEM_REPROCESS': 'Round 2 reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>USER_REVIEW_COMMENT_CHECK': 'Round 2 reprocess complete -> Review starts',
};
