import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CHART_PALETTE } from '@/lib/constants.js';
import { safeNumber, formatDuration, formatPercent } from '@/lib/utils.js';

/**
 * Advanced Workload Share Visualization
 * Features:
 * - Fluid arc transitions (morphing)
 * - Physics-based hover (exploding segments)
 * - Details-on-demand tooltip
 * - Interactive legend with cross-highlighting
 */
export const DonutWorkloadChart = React.memo(({ rows, expanded = false }) => {
  const svgRef = useRef(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [hoverSource, setHoverSource] = useState(null); // 'chart' | 'legend' | null
  
  const size = expanded ? 480 : 260;
  const radius = Math.min(size, size) / 2;
  const innerRadius = radius * (expanded ? 0.65 : 0.6);
  const outerRadius = radius * 0.9;
  const hoverOuterRadius = radius * 0.95;

  const data = useMemo(() => {
    return rows
      .map((row, idx) => ({
        user: row.user || `User ${idx + 1}`,
        value: safeNumber(row.totalSeconds),
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }))
      .filter(d => d.value > 0);
  }, [rows]);

  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  useEffect(() => {
    if (!hoveredUser) return;
    const hasHoveredUser = data.some((item) => item.user === hoveredUser);
    if (hasHoveredUser) return;
    setHoveredUser(null);
    setHoverSource(null);
  }, [data, hoveredUser]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g.chart-group');
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.02);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .cornerRadius(8);

    const pieData = pie(data);

    // Join data
    const paths = g.selectAll('path.arc-segment')
      .data(pieData, d => d.data.user);

    // Remove old
    paths.exit()
      .transition()
      .duration(500)
      .attrTween('d', function(d) {
        const i = d3.interpolate(d.endAngle, d.startAngle);
        return t => {
          d.endAngle = i(t);
          return arc(d);
        };
      })
      .remove();

    // Enter new
    const pathsEnter = paths.enter()
      .append('path')
      .attr('class', 'arc-segment')
      .attr('fill', d => d.data.color)
      .attr('cursor', 'pointer')
      .each(function(d) { this._current = { ...d, endAngle: d.startAngle }; });

    // Update + Enter
    pathsEnter.merge(paths)
      .on('mouseenter', (event, d) => {
        setHoveredUser(d.data.user);
        setHoverSource('chart');
      })
      .on('mouseleave', () => {
        setHoveredUser(null);
        setHoverSource(null);
      })
      .transition()
      .duration(750)
      .ease(d3.easeElasticOut.amplitude(1).period(0.6))
      .attrTween('d', function(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(0);
        return t => {
          const currentArc = i(t);
          arc.outerRadius(outerRadius);
          return arc(currentArc);
        };
      })
      .attr('fill', d => d.data.color);

  }, [data, innerRadius, outerRadius]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g.chart-group');
    const arc = d3.arc().innerRadius(innerRadius).cornerRadius(8);

    g.selectAll('path.arc-segment')
      .interrupt()
      .transition()
      .duration(140)
      .ease(d3.easeCubicOut)
      .attr('opacity', (d) => (hoveredUser && hoveredUser !== d.data.user ? 0.4 : 1))
      .attrTween('d', function(d) {
        const isHovered = hoveredUser === d.data.user;
        const nextOuterRadius = isHovered ? hoverOuterRadius : outerRadius;
        const startOuterRadius = this._outerRadius ?? outerRadius;
        const interpolateOuterRadius = d3.interpolateNumber(startOuterRadius, nextOuterRadius);

        return (t) => {
          const currentOuterRadius = interpolateOuterRadius(t);
          this._outerRadius = currentOuterRadius;
          arc.outerRadius(currentOuterRadius);
          return arc(d);
        };
      });
  }, [hoveredUser, hoverOuterRadius, innerRadius, outerRadius]);

  if (data.length === 0) return null;

  const activeSegment = hoveredUser ? data.find(d => d.user === hoveredUser) : null;

  // Logic to determine which items to show in the legend
  const legendItems = (hoverSource === 'chart' && hoveredUser) 
    ? data.filter(d => d.user === hoveredUser) 
    : data;

  // Stable 6-user view height for the legend (approx 44.5px per row)
  const maxLegendRows = 6;
  const legendRowHeight = 44.5; 
  const legendMaxHeight = maxLegendRows * legendRowHeight;
  
  const legendWrapperStyle = !expanded 
    ? { maxHeight: `${legendMaxHeight}px` } 
    : undefined;

  return (
    <div className={`mt-2 grid grid-cols-1 ${expanded ? 'lg:grid-cols-[1fr_300px] gap-8 xl:gap-12' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-8'} items-start`}>
      {/* SVG Visualization Container */}
      <div className={`relative flex justify-center items-center group min-w-0 py-4 ${expanded ? 'h-[40vh] min-h-[300px] max-h-[480px]' : ''}`}>
        <svg 
          ref={svgRef} 
          viewBox={`0 0 ${size} ${size}`}
          className={`drop-shadow-2xl overflow-visible max-w-full ${expanded ? 'w-full h-full' : `w-[${size}px] h-[${size}px]`}`}
          style={!expanded ? { width: size, height: size } : undefined}
        >
          <g className="chart-group" transform={`translate(${size / 2}, ${size / 2})`}></g>
          
          {/* Central Context Label */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <text textAnchor="middle" className="fill-slate-900 font-bold tracking-tight" style={{ fontSize: expanded ? '32px' : '22px' }}>
              <tspan x="0" dy="0.1em">{activeSegment ? formatDuration(activeSegment.value) : formatDuration(totalValue)}</tspan>
            </text>
            {activeSegment ? (
              <text textAnchor="middle" className="fill-[#2563EB] font-bold" style={{ fontSize: expanded ? '18px' : '15px' }}>
                <tspan x="0" dy="1.6em">{formatPercent(activeSegment.value / totalValue)}</tspan>
              </text>
            ) : (
              <text textAnchor="middle" className="fill-slate-400 font-bold" style={{ fontSize: expanded ? '14px' : '11px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <tspan x="0" dy="1.8em">Total</tspan>
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Interactive Legend (Dual-Mode Focus) */}
      <div 
        className={`flex flex-col gap-1.5 py-4 ${expanded ? 'max-h-[500px] overflow-y-auto pr-2 custom-scrollbar' : 'overflow-y-auto pr-1 no-scrollbar'}`}
        style={legendWrapperStyle}
      >
        {legendItems.map((d) => {
          const isFaded = hoverSource === 'legend' && hoveredUser && d.user !== hoveredUser;
          
          return (
            <div 
              key={d.user}
              onMouseEnter={() => {
                setHoveredUser(d.user);
                setHoverSource('legend');
              }}
              onMouseLeave={() => {
                setHoveredUser(null);
                setHoverSource(null);
              }}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-default border
                ${hoveredUser === d.user ? 'bg-[#EFF6FF] border-[#BFDBFE] shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}
                ${isFaded ? 'opacity-20 pointer-events-none' : 'opacity-100'}
              `}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: d.color, boxShadow: hoveredUser === d.user ? `0 0 10px ${d.color}` : 'none' }}
              />
              <span className={`text-sm font-medium truncate flex-1 ${hoveredUser === d.user ? 'text-[#1D4ED8]' : 'text-slate-500'}`}>
                {d.user}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
});
