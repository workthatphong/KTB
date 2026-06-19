import React from 'react';
import {
  CartesianGrid,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { formatDuration } from '../../lib/durationFormatters.js';

function clampSheetName(name, maxLength = 12) {
  const text = String(name || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function BubbleTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xl">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{point.name}</div>
      <div className="mt-1 text-sm font-semibold text-slate-600">Edit Data Time</div>
      <div className="text-lg font-extrabold text-[#17335f]">{formatDuration(point.x)}</div>
      <div className="mt-2 text-sm font-semibold text-slate-600">Edit Data Items</div>
      <div className="text-lg font-extrabold text-[#17335f]">{point.y.toLocaleString()}</div>
      <div className="mt-2 text-sm font-semibold text-slate-600">Review Count</div>
      <div className="text-lg font-extrabold text-[#17335f]">{point.z.toLocaleString()}</div>
      <div className="mt-2 text-sm font-semibold text-slate-600">Risk Zone</div>
      <div className="text-base font-extrabold" style={{ color: point.fill }}>{point.riskLabel}</div>
    </div>
  );
}

export const EditDataBubbleChart = React.memo(function EditDataBubbleChart({ data, unfilteredData, expanded = false }) {
  const safeData = Array.isArray(data) ? data.filter((item) => Number(item.x) > 0 || Number(item.y) > 0 || Number(item.z) > 0) : [];
  const safeUnfilteredData = Array.isArray(unfilteredData) ? unfilteredData.filter((item) => Number(item.x) > 0 || Number(item.y) > 0 || Number(item.z) > 0) : safeData;

  if (safeUnfilteredData.length === 0) return null;

  const maxX = Math.max(...safeUnfilteredData.map((item) => Number(item.x) || 0), 1);
  const maxY = Math.max(...safeUnfilteredData.map((item) => Number(item.y) || 0), 1);
  const maxZ = Math.max(...safeUnfilteredData.map((item) => Number(item.z) || 0), 1);
  const pivotX = safeUnfilteredData.reduce((sum, item) => sum + (Number(item.x) || 0), 0) / safeUnfilteredData.length;
  const pivotY = safeUnfilteredData.reduce((sum, item) => sum + (Number(item.y) || 0), 0) / safeUnfilteredData.length;

  const activeNames = new Set(safeData.map(d => d.name));

  const coloredData = safeUnfilteredData.map((item) => {
    const isRight = (Number(item.x) || 0) >= pivotX;
    const isTop = (Number(item.y) || 0) >= pivotY;
    const isActive = activeNames.has(item.name);

    let baseColors;
    if (isRight && isTop) {
      baseColors = { fill: '#dc2626', stroke: '#991b1b', riskLabel: 'High Risk' };
    } else if (isRight && !isTop) {
      baseColors = { fill: '#ea580c', stroke: '#9a3412', riskLabel: 'Time-Heavy' };
    } else if (!isRight && isTop) {
      baseColors = { fill: '#0284c7', stroke: '#0c4a6e', riskLabel: 'Volume-Heavy' };
    } else {
      baseColors = { fill: '#16a34a', stroke: '#166534', riskLabel: 'Low Risk' };
    }

    return { 
      ...item, 
      ...baseColors,
      opacity: isActive ? 0.92 : 0.12,
      strokeOpacity: isActive ? 1 : 0.2
    };
  });
  const placedLabels = [];

  const renderBubbleLabel = (props) => {
    const x = Number(props?.x);
    const y = Number(props?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    
    // Only show labels for active items
    if (!activeNames.has(props?.value)) return null;

    const rawName = clampSheetName(props?.value);
    const halfWidth = Math.max(18, rawName.length * 3.2);
    const labelBox = {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - 10,
      bottom: y + 2,
    };

    const overlapsExisting = placedLabels.some((item) => !(
      labelBox.right < item.left
      || labelBox.left > item.right
      || labelBox.bottom < item.top
      || labelBox.top > item.bottom
    ));
    if (overlapsExisting) return null;

    placedLabels.push(labelBox);
    return (
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fill="#0f172a"
        style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}
      >
        {rawName}
      </text>
    );
  };

  return (
    <div className={`w-full ${expanded ? 'h-[min(72vh,42rem)]' : 'h-[26rem]'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 24, bottom: 48, left: 28 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, Math.ceil(maxX * 1.1)]}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            tickFormatter={(value) => formatDuration(value)}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            name="Edit Data Time"
          >
            <Label value="Edit Data Time" position="bottom" offset={18} fill="#475569" style={{ fontSize: 12, fontWeight: 700 }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, Math.ceil(maxY * 1.1)]}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            name="Edit Data Items"
          >
            <Label value="Edit Data Items" angle={-90} position="insideLeft" offset={-10} fill="#475569" style={{ fontSize: 12, fontWeight: 700 }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[90, 900]} domain={[0, maxZ]} name="Review Count" />
          <ReferenceLine x={pivotX} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine y={pivotY} stroke="#94a3b8" strokeDasharray="4 4" />
          <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '4 4', stroke: '#94a3b8' }} />
          <Scatter data={coloredData} fillOpacity={1} strokeWidth={1.5}>
            {coloredData.map((item) => (
              <Cell 
                key={item.name} 
                fill={item.fill} 
                stroke={item.stroke} 
                fillOpacity={item.opacity}
                strokeOpacity={item.strokeOpacity}
              />
            ))}
            <LabelList dataKey="name" content={renderBubbleLabel} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
