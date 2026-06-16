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
} from 'recharts';
import { formatDuration } from '../../lib/utils.js';

function clampLabel(label, maxLength = 12) {
  const text = String(label || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
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

export const SheetBreakdownChart = React.memo(({ data, isDuration = true, expanded = false }) => {
  if (!data || data.length === 0) return null;

  const average = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
  const chartWidth = Math.max(100, data.length * 40);
  const chartHeight = 300; // Consistent base height

  // Calculate ticks for the fixed axis
  const maxVal = Math.max(...data.map(d => d.value), average, 1);
  const getNiceMax = (m) => {
    if (m <= 60) return 60;
    if (m <= 300) return 300;
    if (m <= 3600) return 3600;
    return Math.ceil(m / 3600) * 3600;
  };
  const niceMax = getNiceMax(maxVal);
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  return (
    <div className="flex w-full h-[200px] sm:h-[250px] lg:h-[300px]">
      {/* Fixed Y-Axis */}
      <div className="w-[50px] shrink-0 border-r border-slate-100 bg-white/50 z-10 flex flex-col justify-between py-[40px] pr-2 text-right">
        {ticks.reverse().map((tick) => (
          <div key={tick} className="text-[10px] font-semibold text-slate-500 leading-none">
            {isDuration ? formatDuration(tick) : tick.toLocaleString()}
          </div>
        ))}
      </div>

      {/* Scrollable Plot Area */}
      <div className="flex-1 overflow-x-auto no-scrollbar">
        <div style={{ width: data.length > 10 ? `${chartWidth}px` : '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                tickFormatter={(val) => clampLabel(val, 15)}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis hide domain={[0, niceMax]} />
              <Tooltip content={<CustomTooltip isDuration={isDuration} />} cursor={{ fill: '#f8fafc' }} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                barSize={24}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value >= average ? '#00a4e4' : '#94a3b8'} 
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
              <ReferenceLine
                y={average}
                stroke="#ef4444"
                strokeDasharray="5 5"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});
