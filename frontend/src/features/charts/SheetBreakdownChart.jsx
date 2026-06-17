import React from 'react';
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

function DurationBarLabel({ x, y, width, height, value, index, data, isDuration }) {
  if (value === undefined || value === null || value === 0) return null;
  const average = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
  
  if (value < average) return null;

  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      textAnchor="start"
      fill="#00a4e4"
      className="text-[11px] font-bold"
    >
      {isDuration ? formatDuration(value) : value.toLocaleString()}
    </text>
  );
}

const CustomTooltip = ({ active, payload, label, isDuration }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-lg font-extrabold text-[#17335f]">
          {isDuration ? formatDuration(value) : value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const SheetBreakdownChart = React.memo(({ data, isDuration = true }) => {
  const chartId = React.useId();
  if (!data || data.length === 0) return null;

  const average = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
  const maxVal = Math.max(...data.map(d => d.value), average, 1);
  const niceMax = maxVal * 1.25; 

  const barHeight = 40;
  const viewportHeight = barHeight * 8; 
  const totalContentHeight = data.length * barHeight;
  
  const yAxisWidth = 130;
  const chartMargin = { top: 10, right: 80, left: 10, bottom: 5 };
  const syncId = `sheet-breakdown-${chartId}`;

  return (
    <div className="w-full flex flex-col bg-white mt-4 relative hover:z-50 transition-all overflow-visible">
      {/* Scrollable area for Bars and Y-Axis - Higher Z-index for tooltips */}
      <div 
        className="w-full overflow-y-auto no-scrollbar overflow-x-visible relative z-20" 
        style={{ height: `${viewportHeight}px` }}
      >
        <div style={{ height: `${totalContentHeight}px`, width: '100%', overflow: 'visible' }}>
          <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
            <BarChart
              data={data}
              layout="vertical"
              syncId={syncId}
              margin={{ ...chartMargin, top: 10, bottom: 5 }}
              style={{ overflow: 'visible' }}
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
                content={<CustomTooltip isDuration={isDuration} />} 
                cursor={{ fill: '#f8fafc' }} 
                wrapperStyle={{ zIndex: 1000 }}
                allowEscapeViewBox={{ x: true, y: true }}
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
                    />
                  )} 
                />
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value >= average ? '#00a4e4' : '#94a3b8'} 
                  />
                ))}
              </Bar>
              <ReferenceLine
                x={average}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fixed X-Axis at the bottom - Matching YAxis space to align 0 point */}
      <div className="w-full h-[50px] relative z-10 overflow-visible">
        <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
          <BarChart
            data={data}
            layout="vertical"
            syncId={syncId}
            margin={{ ...chartMargin, top: 0, bottom: 20 }}
            style={{ overflow: 'visible' }}
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
            {/* Show YAxis line but hide everything else to maintain 0-point alignment */}
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
