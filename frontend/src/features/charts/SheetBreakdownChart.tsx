// @ts-nocheck
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
import { formatDuration } from '@/lib/utils';
import { formatTimeTick } from '@/lib/dateFormatters';
import { clampLabel, DurationBarLabel, CustomTooltip } from './SheetBreakdownChartComponents';

export const SheetBreakdownChart = React.memo(({
  data,
  isDuration = true,
  expanded = false,
  showAverageLine = true,
  forcedAverage = null,
  activeFill = '#00a4e4',
  inactiveFill = '#94a3b8',
  valueLabelFill = '#00a4e4',
  isStacked = false,
  isDiffChart = false,
  isButterflyChart = false,
  systemDocumentsSwapped = false,
  onScroll,
  setScrollRef,
}) => {
  const reactId = React.useId();
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const [scrollAreaWidth, setScrollAreaWidth] = useState(0);
  
  if (!data || data.length === 0) return null;

  const labelSpace = 90; // Pixels needed for label
  const yAxisGap = (isDiffChart || isButterflyChart) ? 85 : 5;
  const yAxisWidth = 130 + (isDiffChart || isButterflyChart ? yAxisGap : 0);
  const chartMargin = { top: 10, right: 80, left: 10, bottom: 5 };
  const estimatedPlotWidth = Math.max((scrollAreaWidth || 800) - yAxisWidth - chartMargin.left - chartMargin.right, 200);

  const average = forcedAverage !== null ? forcedAverage : (data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / data.length);
  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), average, 1);

  let niceMax = maxVal * 1.25;
  if (estimatedPlotWidth > labelSpace + 20) {
    niceMax = Math.max(niceMax, maxVal * estimatedPlotWidth / (estimatedPlotWidth - labelSpace));
  } else {
    niceMax = maxVal * 2;
  }

  const maxAbs = Math.max(
    ...data.map(d => {
      if (isButterflyChart) {
        return Math.max(Math.abs(d.leftValue || 0), Math.abs(d.rightValue || 0));
      }
      return Math.abs(Number(d.value) || 0);
    }),
    1
  );

  let niceMaxAbs = maxAbs * 1.25;
  const halfPlotWidth = estimatedPlotWidth / 2;
  if (halfPlotWidth > labelSpace + 20) {
    niceMaxAbs = Math.max(niceMaxAbs, maxAbs * halfPlotWidth / (halfPlotWidth - labelSpace));
  } else {
    niceMaxAbs = maxAbs * 2;
  }

  const xDomain = (isDiffChart || isButterflyChart) ? [-niceMaxAbs, niceMaxAbs] : [0, niceMax];  

  const barHeight = 40;
  const totalContentHeight = data.length * barHeight;
  const viewportHeight = expanded ? totalContentHeight : Math.min(totalContentHeight, barHeight * 8);
  const expandedMaxHeight = 'min(70vh, 640px)';
  
  const plotWidth = Math.max(scrollAreaWidth - yAxisWidth - chartMargin.left - chartMargin.right, 0);
  const averageLabelLeft = yAxisWidth + chartMargin.left + (niceMax > 0 ? (average / niceMax) * plotWidth : 0);
  // Sanitize ID for syncId
  const syncId = `sheet-breakdown-${reactId.replace(/:/g, '_')}`;

  useEffect(() => {
    if (!scrollAreaRef.current) return undefined;

    let timeoutId;
    const updateWidth = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (scrollAreaRef.current) {
          setScrollAreaWidth(scrollAreaRef.current.clientWidth || 0);
        }
      }, 150);
    };

    // Initial width set without delay
    setScrollAreaWidth(scrollAreaRef.current?.clientWidth || 0);

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollAreaRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className={`w-full flex flex-col bg-white relative transition-all ${expanded ? '' : 'mt-4'}`}
      style={expanded ? { maxHeight: expandedMaxHeight } : undefined}
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
        ref={(el) => {
          scrollAreaRef.current = el;
          if (setScrollRef) setScrollRef(el);
        }}
        onScroll={onScroll}
        style={expanded ? undefined : { height: `${viewportHeight}px` }}
      >
        <div style={{ height: `${totalContentHeight}px`, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%" debounce={200}>
            <BarChart
              data={data}
              layout="vertical"
              syncId={syncId}
              margin={{ ...chartMargin, top: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              {(isDiffChart || isButterflyChart) && <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} />}
              <XAxis type="number" domain={xDomain} hide />
              <YAxis 
                dataKey="name"
                type="category"
                axisLine={isButterflyChart ? false : { stroke: '#e2e8f0' }}
                tickLine={false}
                tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
                tickFormatter={(val) => clampLabel(val, 20)}
                width={yAxisWidth}
                interval={0}
                textAnchor="end"
                dx={-yAxisGap}
              />
              <Tooltip 
                content={<CustomTooltip isDuration={isDuration} isDiffChart={isDiffChart} isButterflyChart={isButterflyChart} scrollAreaRef={scrollAreaRef} />} 
                cursor={{ fill: '#f8fafc' }} 
              />
              {isButterflyChart ? (
                <>
                  <Bar dataKey="leftValue" stackId="a" radius={[6, 0, 0, 6]} barSize={20}>
                    <LabelList 
                      content={(props) => (
                        <DurationBarLabel 
                          {...props} 
                          data={data} 
                          isDuration={isDuration} 
                          average={average}
                          isButterflyChart={true}
                        />
                      )} 
                    />
                    {data.map((entry, index) => (
                      <Cell key={`cell-left-${index}-${entry.leftFill}`} fill={entry.leftFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="rightValue" stackId="a" radius={[0, 6, 6, 0]} barSize={20}>
                    <LabelList 
                      content={(props) => (
                        <DurationBarLabel 
                          {...props} 
                          data={data} 
                          isDuration={isDuration} 
                          average={average}
                          isButterflyChart={true}
                        />
                      )} 
                    />
                    {data.map((entry, index) => (
                      <Cell key={`cell-right-${index}-${entry.rightFill}`} fill={entry.rightFill} />
                    ))}
                  </Bar>
                </>
              ) : isStacked ? (
                <>
                  <Bar dataKey="cognizeValue" stackId="a" fill="#00a4e4" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="makerValue" stackId="a" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={20}>
                    <LabelList 
                      content={(props) => (
                        <DurationBarLabel 
                          {...props} 
                          value={props.payload ? props.payload.value : props.value}
                          data={data} 
                          isDuration={isDuration} 
                          average={average}
                          fillColor={valueLabelFill}
                        />
                      )} 
                    />
                  </Bar>
                </>
              ) : (
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
                        isDiffChart={isDiffChart}
                      />
                    )} 
                  />
                  {data.map((entry, index) => {
                    const cellFill = entry.fill || ((Number(entry.value) >= average) ? activeFill : inactiveFill);
                    return (
                      <Cell 
                        key={`cell-${index}-${cellFill}`} 
                        fill={cellFill} 
                      />
                    );
                  })}
                </Bar>
              )}
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
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <BarChart
            data={data}
            layout="vertical"
            syncId={syncId}
            margin={{ ...chartMargin, top: 0, bottom: 20 }}
          >
            <XAxis 
              type="number" 
              domain={xDomain} 
              orientation="bottom"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
              tickFormatter={(val) => {
                const absVal = Math.abs(val);
                const str = isDuration ? formatDuration(absVal) : absVal.toLocaleString();
                const logicalVal = systemDocumentsSwapped ? -val : val;
                return logicalVal < 0 && isDiffChart ? `-${str}` : (logicalVal > 0 && isDiffChart ? `+${str}` : str);
              }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={yAxisWidth} 
              axisLine={isButterflyChart ? false : { stroke: '#e2e8f0' }}
              tick={false}
              tickLine={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
