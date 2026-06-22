import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowDownAZ } from 'lucide-react';
import { ToggleSetting } from '../components/dashboard-view/DashboardViewPanels.jsx';
import { buildChartAnimationKey } from '../components/dashboard-view/DashboardViewUtils.js';
import { formatDuration, formatPercent, clampPercent } from '@/lib/utils.js';
import { toDrillGroup } from '@/lib/segmentUtils.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';

function getCognizeVsOthersData(rows, timeCategory = 'all') {
  if (!rows || rows.length === 0) return { cognizeSeconds: 0, othersSeconds: 0, totalSeconds: 0 };
  let cognizeSeconds = 0;
  let othersSeconds = 0;

  for (const row of rows) {
    if (row.user.toLowerCase() === 'system' || row.user.toLowerCase() === 'idle') continue;
    
    let rowTotal = 0;
    if (timeCategory === 'editData') {
      rowTotal = (row.editDataSeconds || 0);
    } else if (timeCategory === 'editDataRecord') {
      rowTotal = (row.editDataCount || 0);
    } else if (timeCategory === 'review') {
      rowTotal = (row.reviewSeconds || 0);
    } else {
      rowTotal = (row.reviewSeconds || 0) + (row.editDataSeconds || 0) + (row.editMetaSeconds || 0);
    }

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

function buildPageTimeData(segments, timeCategory = 'all', userSortOrder = 'default', userRoleFilter = 'all') {
  if (!segments || segments.length === 0) return { userData: [] };
  const pageStats = new Map();
  
  for (const segment of segments) {
    if (!segment.segmentType?.startsWith('USER_')) continue;
    
    const user = String(segment.userName || '').toLowerCase();
    if (user === 'system' || user === 'idle') continue;
    
    const isCognize = user.includes('cognize');
    if (userRoleFilter === 'maker_only' && isCognize) continue;
    if (userRoleFilter === 'cognize_only' && !isCognize) continue;
    
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) continue;
    
    if (!pageStats.has(sheetKey)) {
      pageStats.set(sheetKey, { name: sheetName || fileName, userFiltered: 0, cognizeFiltered: 0, makerFiltered: 0 });
    }
    
    const stat = pageStats.get(sheetKey);
    const duration = Number(segment.durationSeconds) || 0;
    
    const drillGroup = toDrillGroup(segment.segmentType);
    let matchesCategory = true;
    if (timeCategory === 'editData' && drillGroup !== 'EditData') matchesCategory = false;
    if (timeCategory === 'review' && drillGroup !== 'Review') matchesCategory = false;
    if (timeCategory === 'editDataRecord' && drillGroup !== 'EditData') matchesCategory = false;

    if (matchesCategory) {
      const increment = timeCategory === 'editDataRecord' ? (Number(segment.editDataItemCount) || 1) : duration;
      stat.userFiltered += increment;
      if (isCognize) {
        stat.cognizeFiltered += increment;
      } else {
        stat.makerFiltered += increment;
      }
    }
  }

  const allStats = Array.from(pageStats.values());
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const sortedUser = [...allStats].sort((a, b) => {
    if (userSortOrder === 'desc') {
      const diff = b.userFiltered - a.userFiltered;
      if (diff !== 0) return diff;
    }
    if (userSortOrder === 'asc') {
      const diff = a.userFiltered - b.userFiltered;
      if (diff !== 0) return diff;
    }
    return collator.compare(a.name, b.name);
  });

  return {
    userData: sortedUser.map(s => ({ name: s.name, value: s.userFiltered, cognizeValue: s.cognizeFiltered, makerValue: s.makerFiltered })),
  };
}

const SingleCognizeBar = React.memo(({ data, displayMetric = 'avg', isDuration = true }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const { cognizeSeconds, othersSeconds, totalSeconds } = data;
  if (totalSeconds === 0) return null;

  const cognizePercent = clampPercent((cognizeSeconds / totalSeconds) * 100);
  const othersPercent = clampPercent((othersSeconds / totalSeconds) * 100);

  const isHovering = hoveredSegment !== null;
  let tooltipData = null;
  let tooltipLeft = 0;

  const isPercentDisplay = displayMetric === 'pct_total' || displayMetric === 'pct_avg';
  
  const formatValue = (val) => isDuration ? formatDuration(val) : `${val.toLocaleString()} items`;
  const displayValCognize = isPercentDisplay ? formatPercent(cognizeSeconds / totalSeconds) : formatValue(cognizeSeconds);
  const displayValOthers = isPercentDisplay ? formatPercent(othersSeconds / totalSeconds) : formatValue(othersSeconds);

  if (hoveredSegment === 'cognize') {
    tooltipData = {
      label: 'Cognize',
      value: displayValCognize,
      percent: formatPercent(cognizeSeconds / totalSeconds),
      color: '#00a4e4'
    };
    tooltipLeft = cognizePercent / 2;
  } else if (hoveredSegment === 'others') {
    tooltipData = {
      label: 'Maker',
      value: displayValOthers,
      percent: formatPercent(othersSeconds / totalSeconds),
      color: '#F59E0B'
    };
    tooltipLeft = cognizePercent + (othersPercent / 2);
  }

  return (
    <div className="mt-8">
      {/* Labels */}
      <div className="flex justify-between items-center text-sm font-bold text-[#17335f] mb-3">
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
                  <span className="uppercase tracking-wider">Value</span>
                  <span className="text-[#00a4e4] text-[13px] font-bold">{tooltipData.value}</span>
                </div>
                {!isPercentDisplay && (
                  <div className="flex justify-between items-center">
                    <span className="uppercase tracking-wider">Portion</span>
                    <span className="text-slate-600 font-medium">{tooltipData.percent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Bar */}
        <div className="h-8 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner flex relative">
          <div 
            onMouseEnter={() => setHoveredSegment('cognize')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#00a4e4] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 flex items-center justify-center overflow-hidden ${hoveredSegment === 'others' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${cognizePercent}%` }}
          >
            {cognizePercent > 10 && (
              <span className="text-white text-[11px] font-bold px-2 truncate">
                {displayValCognize}
              </span>
            )}
          </div>
          <div 
            onMouseEnter={() => setHoveredSegment('others')}
            onMouseLeave={() => setHoveredSegment(null)}
            className={`h-full bg-[#F59E0B] cursor-pointer transition-[width,opacity,filter] duration-500 hover:brightness-110 flex items-center justify-center overflow-hidden ${hoveredSegment === 'cognize' ? 'opacity-30' : 'opacity-100'}`}
            style={{ width: `${othersPercent}%` }}
          >
            {othersPercent > 10 && (
              <span className="text-white text-[11px] font-bold px-2 truncate">
                {displayValOthers}
              </span>
            )}
          </div>
        </div>
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
  systemTaskType = 'all'
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [displayMetric, setDisplayMetric] = useState('avg'); // 'pct_total', 'pct_avg', 'total', 'avg'
  const filterRef = useRef(null);

  const isDurationDisplay = systemTaskType !== 'editDataRecord';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSortOrder, setUserSortOrder] = useState('desc');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isStackedView, setIsStackedView] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilterMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstData = useMemo(() => getCognizeVsOthersData(firstContributionRows, systemTaskType), [firstContributionRows, systemTaskType]);
  const secondData = useMemo(() => getCognizeVsOthersData(secondContributionRows, systemTaskType), [secondContributionRows, systemTaskType]);

  const firstPageTimes = useMemo(() => buildPageTimeData(firstSegments, systemTaskType, userSortOrder, userRoleFilter), [firstSegments, systemTaskType, userSortOrder, userRoleFilter]);
  const secondPageTimes = useMemo(() => buildPageTimeData(secondSegments, systemTaskType, userSortOrder, userRoleFilter), [secondSegments, systemTaskType, userSortOrder, userRoleFilter]);

  const firstPageTimesUnfiltered = useMemo(() => buildPageTimeData(firstSegments, systemTaskType, 'default', 'all'), [firstSegments, systemTaskType]);
  const secondPageTimesUnfiltered = useMemo(() => buildPageTimeData(secondSegments, systemTaskType, 'default', 'all'), [secondSegments, systemTaskType]);

  const firstUserAvg = useMemo(() => firstPageTimesUnfiltered.userData.length > 0 ? firstPageTimesUnfiltered.userData.reduce((acc, curr) => acc + curr.value, 0) / firstPageTimesUnfiltered.userData.length : 0, [firstPageTimesUnfiltered.userData]);
  const secondUserAvg = useMemo(() => secondPageTimesUnfiltered.userData.length > 0 ? secondPageTimesUnfiltered.userData.reduce((acc, curr) => acc + curr.value, 0) / secondPageTimesUnfiltered.userData.length : 0, [secondPageTimesUnfiltered.userData]);

  const isTotalBased = displayMetric === 'pct_total' || displayMetric === 'total';
  
  const firstDisplayData = useMemo(() => ({
    cognizeSeconds: isTotalBased ? firstData.cognizeSeconds : (firstData.totalSeconds > 0 ? (firstData.cognizeSeconds / firstData.totalSeconds) * firstUserAvg : 0),
    othersSeconds: isTotalBased ? firstData.othersSeconds : (firstData.totalSeconds > 0 ? (firstData.othersSeconds / firstData.totalSeconds) * firstUserAvg : 0),
    totalSeconds: isTotalBased ? firstData.totalSeconds : firstUserAvg
  }), [isTotalBased, firstUserAvg, firstData]);

  const secondDisplayData = useMemo(() => ({
    cognizeSeconds: isTotalBased ? secondData.cognizeSeconds : (secondData.totalSeconds > 0 ? (secondData.cognizeSeconds / secondData.totalSeconds) * secondUserAvg : 0),
    othersSeconds: isTotalBased ? secondData.othersSeconds : (secondData.totalSeconds > 0 ? (secondData.othersSeconds / secondData.totalSeconds) * secondUserAvg : 0),
    totalSeconds: isTotalBased ? secondData.totalSeconds : secondUserAvg
  }), [isTotalBased, secondUserAvg, secondData]);

  // Generate a stable ID based on the document name for framer-motion layoutId
  const firstPanelId = useMemo(() => `doc-${firstDocumentFilterName || 'first'}`, [firstDocumentFilterName]);
  const secondPanelId = useMemo(() => `doc-${secondDocumentFilterName || 'second'}`, [secondDocumentFilterName]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">User Comparison</h1>
          <p className="text-slate-500 mt-1">Compare user time spent and edit volumes across documents.</p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6">
        <div className="relative min-w-0 bg-white px-0.5 py-1.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#d7e8f6] shadow-ktb text-center sm:text-left animate-stagger-1 cursor-default">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-4 relative z-10">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="whitespace-nowrap overflow-visible sm:overflow-hidden sm:truncate tracking-tighter sm:tracking-normal text-[0.56rem] leading-tight sm:text-sm font-semibold mb-0.5 sm:mb-1 text-slate-500 relative z-10">
            {firstDocumentFilterName || 'First documents'}
          </div>
          <div className="min-w-0 whitespace-nowrap text-[0.72rem] leading-none sm:text-[1.4rem] lg:text-[2rem] 2xl:text-[2.1rem] font-extrabold text-[#17335f] relative z-10">
            {isDurationDisplay ? formatDuration(firstDisplayData.totalSeconds) : `${firstDisplayData.totalSeconds.toLocaleString()} items`}
          </div>
        </div>
        <div className="relative min-w-0 bg-white px-0.5 py-1.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#d7e8f6] shadow-ktb text-center sm:text-left animate-stagger-2 cursor-default">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mb-4 relative z-10">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div className="whitespace-nowrap overflow-visible sm:overflow-hidden sm:truncate tracking-tighter sm:tracking-normal text-[0.56rem] leading-tight sm:text-sm font-semibold mb-0.5 sm:mb-1 text-slate-500 relative z-10">
            {secondDocumentFilterName || 'Second documents'}
          </div>
          <div className="min-w-0 whitespace-nowrap text-[0.72rem] leading-none sm:text-[1.4rem] lg:text-[2rem] 2xl:text-[2.1rem] font-extrabold text-[#17335f] relative z-10">
            {isDurationDisplay ? formatDuration(secondDisplayData.totalSeconds) : `${secondDisplayData.totalSeconds.toLocaleString()} items`}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Block 1: User Breakdown */}
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-1 ${showFilterMenu ? 'z-[120]' : 'z-10'}`}>
          <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display Options</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'avg', label: systemTaskType === 'editDataRecord' ? 'Avg Count' : 'Avg Time' },
                      { id: 'pct_avg', label: '% Avg' },
                      { id: 'total', label: systemTaskType === 'editDataRecord' ? 'Total Count' : 'Total Time' },
                      { id: 'pct_total', label: '% Total' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setDisplayMetric(opt.id)}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          displayMetric === opt.id 
                            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative mb-6 flex justify-center items-center">
            <h2 className="text-xl font-extrabold text-[#17335f]">User Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <AnimatePresence mode="popLayout">
              {/* First Documents */}
              <motion.div 
                key={`user-breakdown-${firstPanelId}`}
                layoutId={`user-breakdown-${firstPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col relative z-10"
              >
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
                    <SingleCognizeBar data={firstDisplayData} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </motion.div>
              
              {/* Second Documents */}
              <motion.div 
                key={`user-breakdown-${secondPanelId}`}
                layoutId={`user-breakdown-${secondPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col relative z-10"
              >
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
                    <SingleCognizeBar data={secondDisplayData} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Block 2: User Time per Page */}
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-2 ${showUserMenu ? 'z-[120]' : 'z-10'}`}>
          <div className="absolute right-4 top-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showUserMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`} title="Display & Sort">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display & Sort</div>
                  <div className="flex flex-col gap-3">
                    <ToggleSetting 
                      checked={isStackedView} 
                      onChange={() => setIsStackedView(prev => !prev)} 
                    >
                      Split Colors
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={userSortOrder === 'desc'} 
                      onChange={() => setUserSortOrder(prev => prev === 'desc' ? 'default' : 'desc')} 
                    >
                      Highest First
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userSortOrder === 'asc'} 
                      onChange={() => setUserSortOrder(prev => prev === 'asc' ? 'default' : 'asc')} 
                    >
                      Lowest First
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={userRoleFilter === 'maker_only'} 
                      onChange={() => setUserRoleFilter(prev => prev === 'maker_only' ? 'all' : 'maker_only')} 
                    >
                      Maker only
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userRoleFilter === 'cognize_only'} 
                      onChange={() => setUserRoleFilter(prev => prev === 'cognize_only' ? 'all' : 'cognize_only')} 
                    >
                      Cognize only
                    </ToggleSetting>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">User Time</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <AnimatePresence mode="popLayout">
              {/* First Documents */}
              <motion.div 
                key={`user-time-${firstPanelId}`}
                layoutId={`user-time-${firstPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col min-h-[240px]"
              >
                <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
                <div className="flex-1 min-h-0">
                  {firstPageTimes.userData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart data={firstPageTimes.userData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" isDuration={isDurationDisplay} isStacked={isStackedView} />
                  )}
                </div>
              </motion.div>
              {/* Second Documents */}
              <motion.div 
                key={`user-time-${secondPanelId}`}
                layoutId={`user-time-${secondPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col min-h-[240px]"
              >
                <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
                <div className="flex-1 min-h-0">
                  {secondPageTimes.userData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart data={secondPageTimes.userData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" isDuration={isDurationDisplay} isStacked={isStackedView} />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
