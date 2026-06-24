// @ts-nocheck
import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';
import { formatDuration } from '@/lib/utils';

const STACK_KEYS = [
  { key: 'vat', label: 'Value-Added', color: '#22C55E' },
  { key: 'wait', label: 'Waiting', color: '#F59E0B' },
  { key: 'rework', label: 'Rework', color: '#EF4444' },
  { key: 'handover', label: 'Handover', color: '#3B82F6' },
  { key: 'other', label: 'Other', color: '#94A3B8' },
];

function formatMinutes(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  if (safeSeconds < 3600) return `${Math.round(safeSeconds / 60)}m`;
  if (safeSeconds < 86400) return `${Math.round(safeSeconds / 3600)}h`;
  if (safeSeconds < 2592000) return `${Math.round(safeSeconds / 86400)}d`;
  return `${Math.round(safeSeconds / 2592000)}mo`;
}

function normalizeChartData(data) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return [];

  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return rows.map((row, index) => ({
    ...row,
    name: row.name || row.label || `Step ${index + 1}`,
  }));

  return rows.map((row, index) => ({
    ...row,
    id: row.key || row.id || row.label || `segment_${index}`,
    name: row.label || row.name || `Segment ${index + 1}`,
    seconds: Number(row.seconds) || 0,
    color: row.color || '#94A3B8',
  }));
}

function getStackKeys(data) {
  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return STACK_KEYS;

  return rows.map((row, index) => ({
    key: row.key || row.id || row.label || `segment_${index}`,
    label: row.label || row.name || `Segment ${index + 1}`,
    color: row.color || '#94A3B8',
  }));
}

function DurationBarLabel({ x, y, width, height, value, index, chartData, isMobile }) {
  const row = chartData[index] || {};
  if (!value) return null;
  return (
    <text
      x={x + width + (isMobile ? 5 : 10)}
      y={y + height / 2 + 5}
      textAnchor="start"
      fill={row.color || '#475569'}
      className={`${isMobile ? 'text-[10px]' : 'text-[12px]'} font-bold`}
    >
      {formatDuration(value)}
    </text>
  );
}

export const ProcessTimeBreakdownChart = ({ data, showLabels = true }) => {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 640);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  const chartData = React.useMemo(() => normalizeChartData(data), [data]);
  const stackKeys = React.useMemo(() => getStackKeys(data), [data]);
  
  return (
    <div className="h-full min-h-[320px] w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={isMobile ? { top: 20, right: 35, left: -20, bottom: 20 } : { top: 20, right: 80, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis 
            type="number"
            tickFormatter={formatMinutes} 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis 
            dataKey="name" 
            type="category"
            interval={0} 
            width={isMobile ? 85 : 130}
            tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, fill: '#1e293b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <Tooltip 
            formatter={(value) => formatDuration(value)} 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          {hasStackShape && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
          {hasStackShape ? (
            stackKeys.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} stackId="process" fill={color} name={label} />
            ))
          ) : (
            <Bar dataKey="seconds" name="Duration" radius={[0, 6, 6, 0]} barSize={32}>
              {showLabels && <LabelList content={(props) => <DurationBarLabel {...props} chartData={chartData} isMobile={isMobile} />} />}
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
