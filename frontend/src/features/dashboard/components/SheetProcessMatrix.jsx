import React, { useState, useMemo } from 'react';
import { LayoutDashboard, FileText, Maximize2, SlidersHorizontal } from 'lucide-react';
import { safeNumber, clampPercent, formatDuration, formatPercent } from '../../../lib/utils.js';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { toDrillGroup } from '../../../lib/segmentUtils.js';

function ToggleSetting({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group relative">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-[#00a4e4]' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900">{children}</span>
    </label>
  );
}

export const SheetProcessMatrix = React.memo(({ segments = [], maxVisibleRows = 6, expanded = false }) => {
  const [mergeReviewAndEdit, setMergeReviewAndEdit] = useState(false);
  const [mergeSpread, setMergeSpread] = useState(false);
  const [hoveredSheet, setHoveredSheet] = useState(null);
  const [hoveredType, setHoveredType] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, sheet: '', type: '', duration: '', percent: '', color: '' });
  
  const containerRef = React.useRef(null);
  const tooltipFrameRef = React.useRef(null);

  const sheetsData = useMemo(() => {
    const sheetMap = new Map();
    segments.forEach(s => {
      const fileName = s.fileName || 'Unknown File';
      const sheetName = s.pageName || '';
      const key = s.sheetKey || s.documentId || `${fileName}::${sheetName}`;
      if (!sheetMap.has(key)) {
        sheetMap.set(key, { 
          name: sheetName || fileName, 
          totals: {
            Uploading: 0,
            Processing: 0,
            Reprocessing: 0,
            Review: 0,
            EditData: 0,
            EditMeta: 0,
            Idle: 0
          }
        });
      }
      const drillGroup = toDrillGroup(s.segmentType);
      const duration = Number(s.durationSeconds) || 0;
      const data = sheetMap.get(key);
      if (drillGroup === 'Uploading') data.totals.Uploading += duration;
      else if (drillGroup === 'Processing') data.totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') data.totals.Reprocessing += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') data.totals.Review += duration;
      else if (drillGroup === 'EditData') data.totals.EditData += duration;
      else if (drillGroup === 'EditMeta') data.totals.EditMeta += duration;
      else if (drillGroup === 'Idle') data.totals.Idle += duration;
    });

    const list = Array.from(sheetMap.values()).map(sheet => {
      const items = [];
      const t = sheet.totals;

      if (mergeReviewAndEdit) {
        const mergedReviewEdit = t.Review + t.EditData + t.EditMeta;
        items.push({ label: 'Uploading', seconds: t.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading });
        if (mergeSpread) {
          items.push({ label: 'Spread', seconds: t.Processing + t.Reprocessing, color: GANTT_DRILL_GROUP_COLORS.Processing });
        } else {
          items.push({ label: 'First Spread', seconds: t.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing });
          items.push({ label: 'Second Spread', seconds: t.Reprocessing, color: GANTT_DRILL_GROUP_COLORS.Reprocessing });
        }
        items.push({ label: 'Review & Edit', seconds: mergedReviewEdit, color: '#F59E0B' });
      } else {
        items.push({ label: 'Uploading', seconds: t.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading });
        if (mergeSpread) {
          items.push({ label: 'Spread', seconds: t.Processing + t.Reprocessing, color: GANTT_DRILL_GROUP_COLORS.Processing });
        } else {
          items.push({ label: 'First Spread', seconds: t.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing });
          items.push({ label: 'Second Spread', seconds: t.Reprocessing, color: GANTT_DRILL_GROUP_COLORS.Reprocessing });
        }
        items.push({ label: 'Review', seconds: t.Review, color: GANTT_DRILL_GROUP_COLORS.Review });
        items.push({ label: 'Edit Data', seconds: t.EditData, color: GANTT_DRILL_GROUP_COLORS.EditData });
        items.push({ label: 'Edit Meta', seconds: t.EditMeta, color: GANTT_DRILL_GROUP_COLORS.EditMeta });
      }

      const totalWorkSeconds = items.reduce((sum, item) => sum + item.seconds, 0);
      if (totalWorkSeconds > 0) {
        items.push({ label: 'Complete', seconds: totalWorkSeconds, color: '#16A34A', isTotal: true });
      }

      return {
        name: sheet.name,
        items: items.filter(it => it.seconds > 0 || it.isTotal),
        totalWorkSeconds
      };
    }).sort((a, b) => b.totalWorkSeconds - a.totalWorkSeconds); // Sort by total by default matching User Breakdown

    return list;
  }, [segments, mergeReviewAndEdit, mergeSpread]);

  const maxTotalWork = useMemo(() => {
    if (sheetsData.length === 0) return 1;
    return Math.max(...sheetsData.map(d => d.totalWorkSeconds), 1);
  }, [sheetsData]);

  const handleMouseMove = (e, sheet, type, duration, percent, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nextTooltip = {
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      sheet,
      type,
      duration,
      percent,
      color
    };

    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
    tooltipFrameRef.current = requestAnimationFrame(() => {
      setTooltip(nextTooltip);
    });
  };

  React.useEffect(() => () => {
    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
  }, []);

  if (sheetsData.length === 0) return null;

  const rowSlotHeight = 72; // Adjusted for padding/margins
  const useScroll = !expanded && sheetsData.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      {/* Legend - Matching UserContributionStackChart style */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-[10px] sm:text-xs text-slate-600 mb-1 font-bold">
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.Uploading }}></span>
          Upload
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.Processing }}></span>
          {mergeSpread ? 'Spread' : 'First Spread'}
        </div>
        {!mergeSpread && (
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.Reprocessing }}></span>
            Second Spread
          </div>
        )}
        {mergeReviewAndEdit ? (
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            Review & Edit
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.Review }}></span>
              Review
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.EditData }}></span>
              Edit Data
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GANTT_DRILL_GROUP_COLORS.EditMeta }}></span>
              Edit Meta
            </div>
          </>
        )}
      </div>

      <div 
        className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2' : ''} space-y-2`} 
        style={wrapperStyle}
      >
        {sheetsData.map((sheet) => {
          const totalWidth = clampPercent((sheet.totalWorkSeconds / maxTotalWork) * 100);
          const workItems = sheet.items.filter(it => !it.isTotal);
          const isSheetDimmed = hoveredSheet && hoveredSheet !== sheet.name;

          return (
            <div 
              key={sheet.name} 
              className={`py-3 transition-all duration-300 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 ${isSheetDimmed ? 'opacity-30 grayscale-[0.3]' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-[#17335f] truncate max-w-[75%]">{sheet.name}</span>
                <span className="text-[12px] font-bold text-slate-500">{formatDuration(sheet.totalWorkSeconds)}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100/80 overflow-hidden shadow-inner flex">
                {workItems.map((item, idx) => {
                  const width = (item.seconds / (sheet.totalWorkSeconds || 1)) * 100;
                  return (
                    <div
                      key={item.label}
                      className="h-full cursor-pointer transition-all duration-300 hover:brightness-110"
                      style={{ 
                        width: `${width}%`, 
                        backgroundColor: item.color,
                        opacity: hoveredSheet === sheet.name && hoveredType !== null && hoveredType !== item.label ? 0.3 : 1
                      }}
                      onMouseEnter={(e) => {
                        handleMouseMove(e, sheet.name, item.label, formatDuration(item.seconds), formatPercent(item.seconds / (sheet.totalWorkSeconds || 1)), item.color);
                        setHoveredSheet(sheet.name);
                        setHoveredType(item.label);
                      }}
                      onMouseMove={(e) => handleMouseMove(e, sheet.name, item.label, formatDuration(item.seconds), formatPercent(item.seconds / (sheet.totalWorkSeconds || 1)), item.color)}
                      onMouseLeave={() => {
                        setTooltip(prev => ({ ...prev, show: false }));
                        setHoveredSheet(null);
                        setHoveredType(null);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {tooltip.show && (
        <div 
          className="absolute pointer-events-none z-[200] w-[210px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in zoom-in duration-150"
          style={{ 
            left: Math.max(0, Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 0) - 220)), 
            top: tooltip.y - 12,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tooltip.color, boxShadow: `0 0 10px ${tooltip.color}66` }} />
            <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">{tooltip.sheet}</div>
          </div>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <span className="uppercase tracking-wider">Step</span>
              <span className="text-[#17335f] text-[12px]">{tooltip.type}</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <span className="uppercase tracking-wider">Duration</span>
              <span className="text-[#00a4e4] text-[13px] font-bold">{tooltip.duration}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase tracking-wider">Portion</span>
              <span className="text-slate-600 font-medium">{tooltip.percent}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
