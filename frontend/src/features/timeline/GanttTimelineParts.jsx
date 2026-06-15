import React from 'react';
import {
  COMPLETE_MARKER_COLOR,
  GANTT_DRILL_GROUP_COLORS,
  MARKER_STAR_INNER_RADIUS,
  MARKER_STAR_OUTER_RADIUS,
  SEGMENT_COLORS
} from '../../lib/constants.js';
import {
  buildAsteriskPoints,
  formatDuration,
  formatTickHeader,
  formatTimeTick,
  isSameCalendarDay,
  toCompleteMarkerType,
  toGanttSegmentTypeLabel
} from '../../lib/utils.js';

export const GanttLegend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
    {items.map((item) => (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
        {item.label}
      </span>
    ))}
  </div>
);

export const GanttHeader = ({ laneLabelWidth, headerScrollRef, timelineSvgWidth, headerHeight, visibleTicks, getTickX, getLabelTs }) => (
  <div className="scroll-clarity-layer flex border-b border-slate-200 bg-slate-50/95 sticky top-0 z-20">
    <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 p-3 max-sm:px-2 flex items-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-sm:text-[9px]">Lane</span>
    </div>
    <div ref={headerScrollRef} className="flex-1 overflow-hidden no-scrollbar">
      <svg width={timelineSvgWidth} height={headerHeight}>
        {visibleTicks.map((tick, idx) => {
          const x = getTickX(tick);
          const labelTs = getLabelTs ? getLabelTs(tick) : tick;
          const previousLabelTs = idx > 0 ? (getLabelTs ? getLabelTs(visibleTicks[idx - 1]) : visibleTicks[idx - 1]) : null;
          const header = formatTickHeader(labelTs);
          const showDate = idx === 0 || !isSameCalendarDay(previousLabelTs, labelTs);
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={headerHeight - 15} y2={headerHeight} stroke="#CBD5E1" />
              <text x={x} y="18" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                <tspan x={x}>{showDate ? header.dateLabel : ''}</tspan>
                <tspan x={x} dy="13">{header.timeLabel}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  </div>
);

export const GanttLaneLabels = ({ visibleLanes, lanes, laneLabelWidth, rowTopPadding, rowSlotHeight, laneHeight }) => (
  <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 bg-white relative">
    {visibleLanes.map((lane) => {
      const idx = lanes.indexOf(lane);
      const y = rowTopPadding + idx * rowSlotHeight;
      return (
        <div key={lane} style={{ position: 'absolute', top: y, width: '100%', height: laneHeight }} className="px-3 max-sm:px-2 flex items-center border-b border-slate-50">
          <span className="text-[11px] max-sm:text-[10px] font-semibold text-slate-700 truncate">{lane}</span>
        </div>
      );
    })}
  </div>
);

export const GanttBarsSvg = ({
  timelineSvgWidth,
  bodyChartHeight,
  visibleTicks,
  visibleLanes,
  lanes,
  laneToPositionedBars,
  rowTopPadding,
  rowSlotHeight,
  barHeight,
  stackStep,
  scrollState,
  showStarMarkers,
  getTickX,
  onPickSegment,
  onShowTooltip,
  onHideTooltip,
  supportsHover,
}) => (
  <svg width={timelineSvgWidth} height={bodyChartHeight} className="block bg-white/50">
    {visibleTicks.map((tick) => (
      <line key={tick} x1={getTickX(tick)} x2={getTickX(tick)} y1={0} y2={bodyChartHeight} stroke="#F1F5F9" />
    ))}

    {visibleLanes.map((lane) => {
      const laneIdx = lanes.indexOf(lane);
      const y = rowTopPadding + laneIdx * rowSlotHeight;
      const positionedBars = laneToPositionedBars[lane] || [];
      const leftBound = scrollState.left - 500;
      const rightBound = scrollState.left + scrollState.viewW + 500;

      return (
        <g key={`bars-${lane}`}>
          {positionedBars.map((positioned, barIdx) => {
            const { s, x, w, stackLevel = 0 } = positioned;
            if (x + w < leftBound || x > rightBound) return null;

            const color = lane === 'Idle'
              ? '#94A3B8'
              : (GANTT_DRILL_GROUP_COLORS[s.drillGroup] || SEGMENT_COLORS[s.segmentType] || '#64748B');
            return (
              <g
                key={`${s.id}-${barIdx}`}
                onClick={() => onPickSegment(s)}
                onPointerEnter={(event) => onShowTooltip(event, s, lane, color)}
                onPointerMove={(event) => onShowTooltip(event, s, lane, color)}
                onPointerLeave={onHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                <rect x={x} y={y + 4 + stackLevel * stackStep} width={w} height={barHeight} rx="6" fill={color} opacity="0.9" />
              </g>
            );
          })}
        </g>
      );
    })}

  </svg>
);

export const GanttTooltip = ({ hoveredSegment }) => {
  if (!hoveredSegment) return null;

  return (
    <div
      className="pointer-events-none absolute z-[200] w-[280px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in zoom-in duration-150"
      style={{
        left: hoveredSegment.x,
        top: hoveredSegment.y,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div 
          className="w-2.5 h-2.5 rounded-full" 
          style={{ 
            backgroundColor: hoveredSegment.color || '#00a4e4',
            boxShadow: `0 0 10px ${(hoveredSegment.color || '#00a4e4')}66`
          }}
        />
        <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
          {toGanttSegmentTypeLabel(hoveredSegment.segmentType)}
        </div>
      </div>
      <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
        <div className="flex justify-between items-center pb-1 border-b border-slate-50">
          <span>Lane</span>
          <span className="text-[#17335f] text-[12px]">{hoveredSegment.lane}</span>
        </div>
        <div className="flex justify-between items-center pb-1 border-b border-slate-50">
          <span>Duration</span>
          <span className="text-[#00a4e4] text-[14px] font-bold">{formatDuration(hoveredSegment.durationSeconds)}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span>Start</span>
            <span className="text-slate-600 font-medium">{formatTimeTick(hoveredSegment.start)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>End</span>
            <span className="text-slate-600 font-medium">{formatTimeTick(hoveredSegment.end)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
