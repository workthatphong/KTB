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

  return (
    <div className="w-full h-full min-h-[250px] sm:min-h-[300px] lg:min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: -10, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            angle={-45}
            textAnchor="end"
            interval={data.length > 15 ? 'preserveStartEnd' : 0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(val) => isDuration ? formatDuration(val) : val}
            width={40}
          />
          <Tooltip content={<CustomTooltip isDuration={isDuration} />} cursor={{ fill: '#f8fafc' }} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            barSize={expanded ? (data.length > 20 ? 15 : 30) : 20}
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
            label={{
              position: 'insideTopRight',
              value: `Avg: ${isDuration ? formatDuration(average) : average.toFixed(1)}`,
              fill: '#ef4444',
              fontSize: 9,
              fontWeight: 'bold',
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
