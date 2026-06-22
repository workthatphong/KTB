import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Users, Clock, SlidersHorizontal } from 'lucide-react';
import { ToggleSetting } from '../components/dashboard-view/DashboardViewPanels.jsx';
import { formatDuration, formatPercent, clampPercent } from '@/lib/utils.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';

function getCognizeVsOthersData(rows) {
  if (!rows || rows.length === 0) return { cognizeSeconds: 0, othersSeconds: 0, totalSeconds: 0 };
  let cognizeSeconds = 0;
  let othersSeconds = 0;

  for (const row of rows) {
    if (row.user.toLowerCase() === 'system' || row.user.toLowerCase() === 'idle') continue;
    const rowTotal = (row.reviewSeconds || 0) + (row.editDataSeconds || 0) + (row.editMetaSeconds || 0);
    if (row.user.toLowerCase().includes('cognize')) {
      cognizeSeconds += rowTotal;
    } else {
      othersSeconds += rowTotal;
    }
  }

  return { 
    cognizeSeconds, 
    othersSeconds, 
    totalSeconds: cognizeSeconds + othersSeconds 
  };
}

function buildPageTimeData(segments) {
  if (!segments || segments.length === 0) return { cognizeData: [], othersData: [] };
  const pageStats = new Map();
  
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    const user = String(segment.userName || '').toLowerCase();
    if (user === 'system' || user === 'idle') continue;
    
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) continue;
    
    if (!pageStats.has(sheetKey)) {
      pageStats.set(sheetKey, { name: sheetName || fileName, cognize: 0, others: 0 });
    }
    
    const stat = pageStats.get(sheetKey);
    const duration = Number(segment.durationSeconds) || 0;
    if (user.includes('cognize')) {
      stat.cognize += duration;
    } else {
      stat.others += duration;
    }
  }

  const cognizeData = [];
  const othersData = [];
  for (const stat of pageStats.values()) {
    cognizeData.push({ name: stat.name, value: stat.cognize });
    othersData.push({ name: stat.name, value: stat.others });
  }

  return {
    cognizeData: cognizeData.sort((a, b) => b.value - a.value),
    othersData: othersData.sort((a, b) => b.value - a.value),
  };
}

const SingleCognizeBar = React.memo(({ data }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const { cognizeSeconds, othersSeconds, totalSeconds } = data;
  if (totalSeconds === 0) return null;

  const cognizePercent = clampPercent((cognizeSeconds / totalSeconds) * 100);
  const othersPercent = clampPercent((othersSeconds / totalSeconds) * 100);

  const isHovering = hoveredSegment !== null;
  let tooltipData = null;
  let tooltipLeft = 0;

  if (hoveredSegment === 'cognize') {
    tooltipData = {
      label: 'Cognize',
      duration: formatDuration(cognizeSeconds),
      percent: formatPercent(cognizeSeconds / totalSeconds),
      color: '#00a4e4'
    };
    tooltipLeft = cognizePercent / 2;
  } else if (hoveredSegment === 'others') {
    tooltipData = {
      label: 'Maker',
      duration: formatDuration(othersSeconds),
      percent: formatPercent(othersSeconds / totalSeconds),
      color: '#F59E0B'
    };
    tooltipLeft = cognizePercent + (othersPercent / 2);
  }

  return (
    <div className="mt-8">
      {/* Labels */}
      <div className="flex justify-between text-sm font-bold text-[#17335f] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#00a4e4]"></span>
          Cognize
        </div>
        <div className="flex items-center gap-2">
          Maker
          <span className="w-3 h-3 rounded-sm bg-[#F59E0B]"></span>
        </div>
      </div>

      {/* Bar and Tooltip Wrapper */}
      <div className="relative w-full">
        {/* Tooltip */}
        {isHovering && tooltipData && (
          <div 
            className="absolute bottom-full mb-3 z-[200] pointer-events-none transition-all duration-200 ease-out"
            style={{ 
              left: `${tooltipLeft}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-[180px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2 mb-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: tooltipData.color, boxShadow: `0 0 10px ${tooltipData.color}66` }}
                />
                <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
                  {tooltipData.label}
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="uppercase tracking-wider">Duration</span>
                  <span className="text-[#00a4e4] text-[13px] font-bold">{tooltipData.duration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-wider">Portion</span>
                  <span className="text-slate-600 font-medium">{tooltipData.percent}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Bar */}
        <div className="h-8 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner flex relative">
          <div 
            onMouseEnter={() => setHoveredSegment('cognize')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#00a4e4] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 ${hoveredSegment === 'others' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${cognizePercent}%` }}
          />
          <div 
            onMouseEnter={() => setHoveredSegment('others')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#F59E0B] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 ${hoveredSegment === 'cognize' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${othersPercent}%` }}
          />
        </div>
      </div>

      {/* Times below bar */}
      <div className="flex justify-between text-xs font-semibold text-slate-500 mt-3">
        <span>{formatDuration(cognizeSeconds)} ({formatPercent(cognizeSeconds / totalSeconds)})</span>
        <span>{formatDuration(othersSeconds)} ({formatPercent(othersSeconds / totalSeconds)})</span>
      </div>
    </div>
  );
});

export function SheetPerformanceView({ 
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstContributionRows,
  secondContributionRows,
  firstSegments,
  secondSegments,
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstData = useMemo(() => getCognizeVsOthersData(firstContributionRows), [firstContributionRows]);
  const secondData = useMemo(() => getCognizeVsOthersData(secondContributionRows), [secondContributionRows]);

  const firstPageTimes = useMemo(() => buildPageTimeData(firstSegments), [firstSegments]);
  const secondPageTimes = useMemo(() => buildPageTimeData(secondSegments), [secondSegments]);

  const firstCognizeAvg = useMemo(() => firstPageTimes.cognizeData.length > 0 ? firstPageTimes.cognizeData.reduce((acc, curr) => acc + curr.value, 0) / firstPageTimes.cognizeData.length : 0, [firstPageTimes.cognizeData]);
  const firstOthersAvg = useMemo(() => firstPageTimes.othersData.length > 0 ? firstPageTimes.othersData.reduce((acc, curr) => acc + curr.value, 0) / firstPageTimes.othersData.length : 0, [firstPageTimes.othersData]);
  const secondCognizeAvg = useMemo(() => secondPageTimes.cognizeData.length > 0 ? secondPageTimes.cognizeData.reduce((acc, curr) => acc + curr.value, 0) / secondPageTimes.cognizeData.length : 0, [secondPageTimes.cognizeData]);
  const secondOthersAvg = useMemo(() => secondPageTimes.othersData.length > 0 ? secondPageTimes.othersData.reduce((acc, curr) => acc + curr.value, 0) / secondPageTimes.othersData.length : 0, [secondPageTimes.othersData]);

  const firstDisplayData = useMemo(() => ({
    cognizeSeconds: showTotal ? firstData.cognizeSeconds : firstCognizeAvg,
    othersSeconds: showTotal ? firstData.othersSeconds : firstOthersAvg,
    totalSeconds: showTotal ? firstData.totalSeconds : (firstCognizeAvg + firstOthersAvg)
  }), [showTotal, firstCognizeAvg, firstOthersAvg, firstData]);

  const secondDisplayData = useMemo(() => ({
    cognizeSeconds: showTotal ? secondData.cognizeSeconds : secondCognizeAvg,
    othersSeconds: showTotal ? secondData.othersSeconds : secondOthersAvg,
    totalSeconds: showTotal ? secondData.totalSeconds : (secondCognizeAvg + secondOthersAvg)
  }), [showTotal, secondCognizeAvg, secondOthersAvg, secondData]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">Sheet Performance</h1>
          <p className="text-slate-500 mt-1">Detailed performance analysis breakdown by individual sheets and pages.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Block 1: User Breakdown */}
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group ${showFilterMenu ? 'z-[120]' : 'z-10'}`}>
          <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display Options</div>
                  <div className="space-y-3">
                    <ToggleSetting checked={showTotal} onChange={() => setShowTotal(!showTotal)}>Show Total Time</ToggleSetting>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative mb-6 flex justify-center items-center">
            <h2 className="text-xl font-extrabold text-[#17335f]">User Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* First Documents */}
            <div className="flex flex-col relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-slate-500">{firstDocumentFilterName || 'First documents'}</h3>
              </div>
              <div className="flex-1 min-h-[120px] flex flex-col justify-center">
                {firstDisplayData.totalSeconds === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                    <Users className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SingleCognizeBar data={firstDisplayData} />
                )}
              </div>
            </div>
            
            {/* Second Documents */}
            <div className="flex flex-col relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-slate-500">{secondDocumentFilterName || 'Second Documents'}</h3>
              </div>
              <div className="flex-1 min-h-[120px] flex flex-col justify-center">
                {secondDisplayData.totalSeconds === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                    <Users className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SingleCognizeBar data={secondDisplayData} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block 2: Cognize Time per Page */}
        <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col">
          <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">Cognize Time</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* First Documents */}
            <div className="flex flex-col min-h-[240px]">
              <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
              <div className="flex-1 min-h-0">
                {firstPageTimes.cognizeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart data={firstPageTimes.cognizeData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" />
                )}
              </div>
            </div>
            {/* Second Documents */}
            <div className="flex flex-col min-h-[240px]">
              <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
              <div className="flex-1 min-h-0">
                {secondPageTimes.cognizeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart data={secondPageTimes.cognizeData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Other User Time per Page */}
        <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col">
          <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">Maker Time</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* First Documents */}
            <div className="flex flex-col min-h-[240px]">
              <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
              <div className="flex-1 min-h-0">
                {firstPageTimes.othersData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart data={firstPageTimes.othersData} expanded activeFill="#F59E0B" valueLabelFill="#F59E0B" />
                )}
              </div>
            </div>
            {/* Second Documents */}
            <div className="flex flex-col min-h-[240px]">
              <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
              <div className="flex-1 min-h-0">
                {secondPageTimes.othersData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart data={secondPageTimes.othersData} expanded activeFill="#F59E0B" valueLabelFill="#F59E0B" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
