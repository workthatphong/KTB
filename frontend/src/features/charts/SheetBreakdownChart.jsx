import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { formatDuration } from '../../lib/utils.js';

function clampLabel(label, maxLength = 12) {
  const text = String(label || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function DurationBarLabel({ x, y, width, height, value, index, data, isDuration, average, fillColor }) {
  if (value === undefined || value === null || value === 0) return null;
  
  if (value < average) return null;

  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      textAnchor="start"
      fill={fillColor}
      className="text-[11px] font-bold"
    >
      {isDuration ? formatDuration(value) : value.toLocaleString()}
    </text>
  );
}

const CustomTooltip = ({ active, payload, label, isDuration, coordinate, containerRef }) => {
  if (active && payload && payload.length && coordinate && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const value = payload[0].value;
    
    const left = rect.left + coordinate.x + 10;
    const top = rect.top + coordinate.y - 60;

    return createPortal(
      <div 
        className="fixed pointer-events-none bg-white p-3 border border-slate-200 shadow-2xl rounded-xl z-[99999]"
        style={{ left: `${left}px`, top: `${top}px` }}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-lg font-extrabold text-[#17335f]">
          {isDuration ? formatDuration(value) : value.toLocaleString()}
        </p>
      </div>,
      document.body
    );
  }
  return null;
};

export const SheetBreakdownChart = React.memo(({
  data,
  isDuration = true,
  expanded = false,
  showAverageLine = true,
  forcedAverage = null,
  activeFill = '#00a4e4',
  inactiveFill = '#94a3b8',
  valueLabelFill = '#00a4e4',
}) => {
  const reactId = React.useId();
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const [scrollAreaWidth, setScrollAreaWidth] = useState(0);
  
  if (!data || data.length === 0) return null;

  const average = forcedAverage !== null ? forcedAverage : (data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / data.length);
  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), average, 1);
  const niceMax = maxVal * 1.25; 

  const barHeight = 40;
  const totalContentHeight = data.length * barHeight;
  const viewportHeight = expanded ? totalContentHeight : Math.min(totalContentHeight, barHeight * 8);
  
  const yAxisWidth = 130;
  const chartMargin = { top: 10, right: 80, left: 10, bottom: 5 };
  const plotWidth = Math.max(scrollAreaWidth - yAxisWidth - chartMargin.left - chartMargin.right, 0);
  const averageLabelLeft = yAxisWidth + chartMargin.left + (niceMax > 0 ? (average / niceMax) * plotWidth : 0);
  // Sanitize ID for syncId
  const syncId = `sheet-breakdown-${reactId.replace(/:/g, '_')}`;

  useEffect(() => {
    if (!scrollAreaRef.current) return undefined;

    const updateWidth = () => {
      setScrollAreaWidth(scrollAreaRef.current?.clientWidth || 0);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollAreaRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`w-full flex flex-col bg-white relative transition-all ${expanded ? 'h-[min(70vh,640px)]' : 'mt-4'}`}
      ref={containerRef}
    >
      {showAverageLine && scrollAreaWidth > 0 && (
        <div className="relative z-20 h-4 pointer-events-none overflow-visible">
          <div
            className="absolute -translate-x-1/2 text-[10px] font-bold text-red-500"
            style={{ left: `${averageLabelLeft}px`, top: '0px' }}
          >
            {`Avg ${isDuration ? formatDuration(average) : average.toLocaleString()}`}
          </div>
        </div>
      )}
      {/* Scrollable area for Bars and Y-Axis */}
      <div 
        className={`w-full overflow-y-auto no-scrollbar relative z-10 ${expanded ? 'flex-1 min-h-0' : ''}`}
        ref={scrollAreaRef}
        style={expanded ? undefined : { height: `${viewportHeight}px` }}
      >
        <div style={{ height: `${totalContentHeight}px`, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              syncId={syncId}
              margin={{ ...chartMargin, top: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, niceMax]} hide />
              <YAxis 
                dataKey="name"
                type="category"
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
                tickFormatter={(val) => clampLabel(val, 20)}
                width={yAxisWidth}
                interval={0}
                textAnchor="end"
                dx={-5}
              />
              <Tooltip 
                content={<CustomTooltip isDuration={isDuration} containerRef={containerRef} />} 
                cursor={{ fill: '#f8fafc' }} 
              />
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                barSize={20}
              >
                <LabelList 
                  content={(props) => (
                    <DurationBarLabel 
                      {...props} 
                      data={data} 
                      isDuration={isDuration} 
                      average={average}
                      fillColor={valueLabelFill}
                    />
                  )} 
                />
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={(Number(entry.value) >= average) ? activeFill : inactiveFill} 
                  />
                ))}
              </Bar>
              {showAverageLine && (
                <ReferenceLine
                  x={average}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fixed X-Axis at the bottom */}
      <div className="w-full h-[50px] relative z-0 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            syncId={syncId}
            margin={{ ...chartMargin, top: 0, bottom: 20 }}
          >
            <XAxis 
              type="number" 
              domain={[0, niceMax]} 
              orientation="bottom"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
              tickFormatter={(val) => isDuration ? formatDuration(val) : val.toLocaleString()}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={yAxisWidth} 
              axisLine={{ stroke: '#e2e8f0' }}
              tick={false}
              tickLine={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
