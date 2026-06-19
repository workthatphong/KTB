import React, { useState, useMemo } from 'react';
import { safeNumber, clampPercent, formatDuration, formatPercent } from '@/lib/utils.js';

/**
 * Top User Work Mix (Restored Original Styles with Interactive Tooltips)
 */
export const UserContributionStackChart = React.memo(({ rows = [], expanded = false }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, user: '', type: '', duration: '', percent: '', color: '' });
  const [hoveredUser, setHoveredUser] = useState(null);
  const [hoveredType, setHoveredType] = useState(null);
  const containerRef = React.useRef(null);
  const tooltipFrameRef = React.useRef(null);

  const prepared = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const review = safeNumber(row.reviewSeconds);
        const editData = safeNumber(row.editDataSeconds);
        const editMeta = safeNumber(row.editMetaSeconds);
        const total = review + editData + editMeta;
        return {
          user: row.user || 'Unknown User',
          review,
          editData,
          editMeta,
          total,
          reworkRate: safeNumber(row.reworkRate),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const maxTotal = useMemo(() => {
    if (prepared.length === 0) return 1;
    return Math.max(...prepared.map(d => d.total), 1);
  }, [prepared]);

  if (prepared.length === 0) return null;

  const maxVisibleRows = 4;
  const rowSlotHeight = 63.5; 
  const useScroll = prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  const handleMouseMove = (e, user, type, duration, percent, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nextTooltip = {
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      user,
      type,
      duration,
      percent,
      color
    };

    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
    tooltipFrameRef.current = requestAnimationFrame(() => {
      setTooltip((prev) => {
        if (
          prev.show === nextTooltip.show &&
          prev.x === nextTooltip.x &&
          prev.y === nextTooltip.y &&
          prev.user === nextTooltip.user &&
          prev.type === nextTooltip.type &&
          prev.duration === nextTooltip.duration &&
          prev.percent === nextTooltip.percent &&
          prev.color === nextTooltip.color
        ) {
          return prev;
        }
        return nextTooltip;
      });
    });
  };

  React.useEffect(() => () => {
    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
  }, []);

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600 mb-1">
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span>
          Review
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
          Edit Data
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C]"></span>
          Edit Meta
        </div>
      </div>

      <div 
        className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2' : ''} space-y-1`} 
        style={wrapperStyle}
      >
        {prepared.map((row) => {
          const currentMax = maxTotal || 1;
          const totalWidth = clampPercent(Math.max((row.total / currentMax) * 100, 12));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editDataWidth = row.total > 0 ? clampPercent((row.editData / row.total) * 100) : 0;
          const editMetaWidth = row.total > 0 ? clampPercent((row.editMeta / row.total) * 100) : 0;
          const isUserDimmed = hoveredUser && hoveredUser !== row.user;

          return (
            <div 
              key={row.user} 
              className={`py-2.5 transition-all duration-300 group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 ${isUserDimmed ? 'opacity-30 grayscale-[0.3]' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-[#17335f] truncate">{row.user}</span>
                <span className="text-[12px] font-bold text-slate-500">{formatDuration(row.total)}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100/80 overflow-hidden shadow-inner">
                <div className="h-full rounded-full overflow-hidden flex shadow-sm transition-[width] duration-500 ease-out" style={{ width: `${totalWidth}%` }}>
                  <div 
                    onMouseEnter={(e) => {
                      handleMouseMove(e, row.user, 'Review', formatDuration(row.review), formatPercent(row.review / (row.total || 1)), '#06B6D4');
                      setHoveredUser(row.user);
                      setHoveredType('review');
                    }}
                    onMouseMove={(e) => handleMouseMove(e, row.user, 'Review', formatDuration(row.review), formatPercent(row.review / (row.total || 1)), '#06B6D4')}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, show: false }));
                      setHoveredUser(null);
                      setHoveredType(null);
                    }}
                    className={`h-full bg-[#06B6D4] cursor-pointer transition-[width,opacity,filter] duration-500 ease-out hover:brightness-110 ${hoveredUser === row.user && hoveredType !== null && hoveredType !== 'review' ? 'opacity-20' : 'opacity-100'}`}
                    style={{ width: `${reviewWidth}%` }}
                  />
                  <div 
                    onMouseEnter={(e) => {
                      handleMouseMove(e, row.user, 'Edit Data', formatDuration(row.editData), formatPercent(row.editData / (row.total || 1)), '#F59E0B');
                      setHoveredUser(row.user);
                      setHoveredType('editData');
                    }}
                    onMouseMove={(e) => handleMouseMove(e, row.user, 'Edit Data', formatDuration(row.editData), formatPercent(row.editData / (row.total || 1)), '#F59E0B')}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, show: false }));
                      setHoveredUser(null);
                      setHoveredType(null);
                    }}
                    className={`h-full bg-[#F59E0B] cursor-pointer transition-[width,opacity,filter] duration-500 ease-out hover:brightness-110 ${hoveredUser === row.user && hoveredType !== null && hoveredType !== 'editData' ? 'opacity-20' : 'opacity-100'}`}
                    style={{ width: `${editDataWidth}%` }}
                  />
                  <div
                    onMouseEnter={(e) => {
                      handleMouseMove(e, row.user, 'Edit Meta', formatDuration(row.editMeta), formatPercent(row.editMeta / (row.total || 1)), '#C2410C');
                      setHoveredUser(row.user);
                      setHoveredType('editMeta');
                    }}
                    onMouseMove={(e) => handleMouseMove(e, row.user, 'Edit Meta', formatDuration(row.editMeta), formatPercent(row.editMeta / (row.total || 1)), '#C2410C')}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, show: false }));
                      setHoveredUser(null);
                      setHoveredType(null);
                    }}
                    className={`h-full bg-[#C2410C] cursor-pointer transition-[width,opacity,filter] duration-500 ease-out hover:brightness-110 ${hoveredUser === row.user && hoveredType !== null && hoveredType !== 'editMeta' ? 'opacity-20' : 'opacity-100'}`}
                    style={{ width: `${editMetaWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Tooltip matching Timeline/Matrix */}
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
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ 
                backgroundColor: tooltip.color,
                boxShadow: `0 0 10px ${tooltip.color}66`
              }}
            />
            <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
              {tooltip.user}
            </div>
          </div>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <span className="uppercase tracking-wider">Type</span>
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
